const express = require('express')
const Order = require('../models/Order')
const Product = require('../models/Product')
const User = require('../models/User')
const ChatMessage = require('../models/ChatMessage')
const { protect, admin } = require('../middleware/authMiddleware')

const router = express.Router()

function monthKeyFromDate(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(monthKey) {
  const [year, month] = String(monthKey || '').split('-').map(Number)
  if (!year || !month) return monthKey
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' })
}

function rollingAverage(nums) {
  const values = (nums || []).filter((n) => Number.isFinite(n))
  if (!values.length) return 0
  return values.reduce((sum, n) => sum + n, 0) / values.length
}

function parseSearchTopic(text) {
  const lower = String(text || '').toLowerCase()
  if (!/(show|find|search|tell me about|what is|who is|recommend|suggest|list)/.test(lower)) return ''
  const cleaned = lower
    .replace(/\b(show|find|search|tell me about|what is|who is|recommend|suggest|list|me|please|products?|items?|about)\b/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return ''
  return cleaned.split(' ').slice(0, 3).join(' ')
}

router.get('/dashboard', protect, admin, async (req, res, next) => {
  try {
    const now = new Date()
    const start30d = new Date(now)
    start30d.setDate(now.getDate() - 30)

    const start7d = new Date(now)
    start7d.setDate(now.getDate() - 7)

    const start12m = new Date(now.getFullYear(), now.getMonth() - 11, 1)

    const [orders, products, users, recentChats] = await Promise.all([
      Order.find({}).lean().exec(),
      Product.find({}).lean().exec(),
      User.find({}).lean().exec(),
      ChatMessage.find({ createdAt: { $gte: start30d } }).sort({ createdAt: -1 }).limit(300).lean().exec()
    ])

    const totalOrders = orders.length
    const totalSales = orders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0)
    const paidSales = orders
      .filter((o) => o.isPaid)
      .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0)
    const uniqueBuyers = new Set(orders.map((o) => String(o.user || ''))).size
    const activeUsers = users.filter((u) => new Date(u.updatedAt || u.createdAt) >= start30d).length

    const orderCountByUser = new Map()
    for (const order of orders) {
      const key = String(order.user || '')
      orderCountByUser.set(key, (orderCountByUser.get(key) || 0) + 1)
    }
    const returningCustomers = Array.from(orderCountByUser.values()).filter((count) => count >= 2).length

    const monthlyMap = new Map()
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      monthlyMap.set(monthKeyFromDate(d), 0)
    }
    for (const order of orders) {
      const createdAt = new Date(order.createdAt)
      if (createdAt < start12m) continue
      const key = monthKeyFromDate(createdAt)
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(order.totalPrice || 0))
    }
    const monthlySales = Array.from(monthlyMap.entries()).map(([key, value]) => ({
      monthKey: key,
      month: monthLabel(key),
      sales: Number(value.toFixed(2))
    }))

    const last3Months = monthlySales.slice(-3).map((m) => m.sales)
    const predictedMonthlyRevenue = Number(rollingAverage(last3Months).toFixed(2))
    const recentWeekSales = orders
      .filter((o) => new Date(o.createdAt) >= start7d)
      .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0)
    const predictedNextWeekSales = Number((recentWeekSales * 1.07).toFixed(2))

    const salesPrediction = {
      expectedNextWeekSales: predictedNextWeekSales,
      expectedMonthlyRevenue: predictedMonthlyRevenue,
      monthlySales
    }

    const topSellingMap = new Map()
    const sold30dMap = new Map()
    for (const order of orders) {
      const isLast30d = new Date(order.createdAt) >= start30d
      for (const item of order.orderItems || []) {
        const key = String(item.product || item.name || '')
        if (!key) continue
        const qty = Number(item.qty || 0)
        const name = String(item.name || 'Unknown Product')

        const prevTop = topSellingMap.get(key) || { name, qtySold: 0, revenue: 0 }
        topSellingMap.set(key, {
          name: prevTop.name || name,
          qtySold: prevTop.qtySold + qty,
          revenue: Number((prevTop.revenue + qty * Number(item.price || 0)).toFixed(2))
        })

        if (isLast30d) {
          sold30dMap.set(key, (sold30dMap.get(key) || 0) + qty)
        }
      }
    }

    const productById = new Map(products.map((p) => [String(p._id), p]))

    const topSellingProducts = Array.from(topSellingMap.entries())
      .map(([productId, row]) => ({
        ...row,
        currentQuantity: Number(productById.get(productId)?.countInStock || 0)
      }))
      .sort((a, b) => b.qtySold - a.qtySold)
      .slice(0, 5)

    const trendingItems = Array.from(sold30dMap.entries())
      .map(([productId, qtySold]) => {
        const product = productById.get(productId)
        return {
          _id: productId,
          name: product?.name || 'Unknown Product',
          category: product?.category || 'General',
          qtySold,
          currentQuantity: Number(product?.countInStock || 0)
        }
      })
      .sort((a, b) => b.qtySold - a.qtySold)
      .slice(0, 6)

    const inventoryPrediction = products
      .map((p) => {
        const key = String(p._id)
        const sold30d = Number(sold30dMap.get(key) || 0)
        const stock = Number(p.countInStock || 0)
        const projectedDaysLeft = sold30d > 0 ? Math.floor((stock / sold30d) * 30) : 999
        let predictedStatus = 'Stable'
        if (stock <= 0) predictedStatus = 'Out of stock'
        else if (stock <= 3 || projectedDaysLeft <= 10) predictedStatus = 'Critical'
        else if (stock <= 10 || projectedDaysLeft <= 20) predictedStatus = 'Low soon'

        return {
          _id: p._id,
          name: p.name,
          currentStock: stock,
          soldLast30Days: sold30d,
          predictedStatus
        }
      })
      .sort((a, b) => {
        const severity = { 'Out of stock': 4, Critical: 3, 'Low soon': 2, Stable: 1 }
        return (severity[b.predictedStatus] || 0) - (severity[a.predictedStatus] || 0)
      })
      .slice(0, 8)

    const recommendations = products
      .slice()
      .sort((a, b) => {
        const scoreA = Number(a.rating || 0) * 2 + Number(a.reviews || 0)
        const scoreB = Number(b.rating || 0) * 2 + Number(b.reviews || 0)
        return scoreB - scoreA
      })
      .slice(0, 8)
      .map((p) => ({
        _id: p._id,
        name: p.name,
        category: p.category,
        price: p.price,
        rating: p.rating
      }))

    const relatedProducts = products
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8)
      .map((p) => ({
        _id: p._id,
        name: p.name,
        category: p.category,
        price: p.price
      }))

    const searchCounts = new Map()
    for (const row of recentChats) {
      const topic = parseSearchTopic(row.userMessage)
      if (!topic) continue
      searchCounts.set(topic, (searchCounts.get(topic) || 0) + 1)
    }
    const mostSearchedProducts = Array.from(searchCounts.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    res.json({
      cards: {
        totalSales: Number(totalSales.toFixed(2)),
        paidSales: Number(paidSales.toFixed(2)),
        totalOrders,
        activeUsers,
        uniqueBuyers
      },
      salesPrediction,
      inventoryPrediction,
      topSellingProducts,
      recommendations: {
        recommendedProducts: recommendations,
        relatedProducts,
        trendingItems
      },
      customerAnalytics: {
        activeUsers,
        returningCustomers,
        mostSearchedProducts
      }
    })
  } catch (e) {
    next(e)
  }
})

const { getSiteUrl } = require('../config/siteUrl')

function scoreProductSeo(product) {
  const issues = []
  let score = 0
  const checks = [
    { ok: Boolean(String(product.metaTitle || '').trim()), label: 'Meta title missing' },
    { ok: Boolean(String(product.metaDescription || '').trim()), label: 'Meta description missing' },
    { ok: Boolean(String(product.metaKeywords || '').trim()), label: 'Meta keywords missing' },
    { ok: Boolean(String(product.description || '').trim()), label: 'Product description missing' },
    { ok: Array.isArray(product.images) && product.images.length > 0, label: 'Product image missing' },
    { ok: Boolean(String(product.name || '').trim()), label: 'Product name missing' },
    { ok: Boolean(String(product.category || '').trim()), label: 'Category missing' }
  ]
  for (const check of checks) {
    if (check.ok) score += 1
    else issues.push(check.label)
  }
  return { score, maxScore: checks.length, issues }
}

function buildParasiteTemplates(product, siteUrl) {
  const productUrl = `${siteUrl}/product/${product._id}`
  const title = product.metaTitle || `${product.name} | Fine Jewellery`
  const summary = product.metaDescription || product.description || ''
  const category = product.category || 'jewellery'

  return {
    productUrl,
    medium: `# ${title}

${summary}

Why customers choose this piece:
- Category: ${category}
- Metal: ${product.metal || 'Premium metal'}
- Craftsmanship: ${product.hallmark || 'Quality assured'}

Read more and shop here:
${productUrl}

#jewellery #${String(category).replace(/\s+/g, '')} #AurumJewelCo`,
    linkedin: `New highlight from Aurum Jewel Co.

${product.name} — ${summary}

Perfect for customers looking for premium ${category.toLowerCase()} in Pakistan.

Explore product details: ${productUrl}

#jewellery #ecommerce #lahore #finejewellery`,
    quora: `Question: What is a good ${category.toLowerCase()} option to buy online in Pakistan?

Answer:
I recommend checking ${product.name}. ${summary}

You can view full details here: ${productUrl}

It is a solid option if you want quality ${category.toLowerCase()} with clear product information and secure checkout.`,
    reddit: `Title: Found a great ${category.toLowerCase()} piece — ${product.name}

Body:
${summary}

Link: ${productUrl}

Happy to answer questions about quality, pricing, and delivery.`
  }
}

router.get('/seo/audit', protect, admin, async (req, res, next) => {
  try {
    const products = await Product.find({})
      .select('name category metaTitle metaDescription metaKeywords description images')
      .lean()
      .exec()

    const rows = products.map((p) => {
      const { score, maxScore, issues } = scoreProductSeo(p)
      return {
        _id: p._id,
        name: p.name,
        category: p.category,
        score,
        maxScore,
        issues,
        status: issues.length === 0 ? 'good' : issues.length <= 2 ? 'needs-work' : 'critical'
      }
    })

    const summary = {
      totalProducts: rows.length,
      good: rows.filter((r) => r.status === 'good').length,
      needsWork: rows.filter((r) => r.status === 'needs-work').length,
      critical: rows.filter((r) => r.status === 'critical').length
    }

    res.json({ summary, products: rows })
  } catch (e) {
    next(e)
  }
})

router.get('/seo/parasite-template/:productId', protect, admin, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.productId).lean().exec()
    if (!product) {
      res.status(404)
      return next(new Error('Product not found'))
    }
    const siteUrl = getSiteUrl(req)
    res.json({
      product: { _id: product._id, name: product.name, category: product.category },
      templates: buildParasiteTemplates(product, siteUrl),
      backlinkPitch: `Hi,\n\nI run Aurum Jewel Co., a fine jewellery store in Lahore. We recently published "${product.name}" and thought your audience might find it useful.\n\nProduct page: ${siteUrl}/product/${product._id}\n\nIf relevant, a mention or link would be appreciated.\n\nThank you!`
    })
  } catch (e) {
    next(e)
  }
})

router.get('/payment-settings', protect, admin, async (req, res, next) => {
  try {
    const StoreSettings = require('../models/StoreSettings')
    const { getMerchantPaymentDetails } = require('../config/paymentConfig')
    const saved = await StoreSettings.findOne({ key: 'payment' }).lean().exec()
    const effective = await getMerchantPaymentDetails()
    res.json({
      saved: saved || {},
      effective: effective.bank
    })
  } catch (e) {
    next(e)
  }
})

router.put('/payment-settings', protect, admin, async (req, res, next) => {
  try {
    const StoreSettings = require('../models/StoreSettings')
    const {
      bankAccountTitle,
      bankName,
      bankAccountNumber,
      bankIban,
      bankBranch
    } = req.body || {}

    const updated = await StoreSettings.findOneAndUpdate(
      { key: 'payment' },
      {
        key: 'payment',
        bankAccountTitle: String(bankAccountTitle || '').trim(),
        bankName: String(bankName || '').trim(),
        bankAccountNumber: String(bankAccountNumber || '').trim(),
        bankIban: String(bankIban || '').trim(),
        bankBranch: String(bankBranch || '').trim()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean()

    const { getMerchantPaymentDetails } = require('../config/paymentConfig')
    const effective = await getMerchantPaymentDetails()
    res.json({ saved: updated, effective: effective.bank })
  } catch (e) {
    next(e)
  }
})

module.exports = router

