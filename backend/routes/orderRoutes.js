const express = require('express')
const Stripe = require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')
const Order = require('../models/Order')
const Cart = require('../models/Cart')
const Product = require('../models/Product')
const User = require('../models/User')
const { sendOrderConfirmationEmail } = require('../services/emailService')
const { protect, admin } = require('../middleware/authMiddleware')

const router = express.Router()

function buildTrackingTimeline(order) {
  const timeline = [
    { status: 'Order Placed', at: order.createdAt || null, done: true },
    { status: 'Payment Confirmed', at: order.isPaid ? order.paidAt || null : null, done: !!order.isPaid },
    { status: 'Packed', at: order.isPaid ? order.paidAt || null : null, done: !!order.isPaid },
    { status: 'Out For Delivery', at: order.isDelivered ? order.deliveredAt || null : null, done: !!order.isDelivered },
    { status: 'Delivered', at: order.isDelivered ? order.deliveredAt || null : null, done: !!order.isDelivered }
  ]
  return timeline
}

// GET /api/orders/all (admin only)
router.get('/all', protect, admin, async (req, res, next) => {
  try {
    const orders = await Order.find({}).populate('user', 'name email').sort({ createdAt: -1 })
    res.json(orders)
  } catch (e) {
    next(e)
  }
})

// GET /api/orders (current user)
router.get('/', protect, async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 })
    res.json(orders)
  } catch (e) {
    next(e)
  }
})

// GET /api/orders/:id/tracking
router.get('/:id/tracking', protect, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
    if (!order) {
      res.status(404)
      return next(new Error('Order not found'))
    }
    res.json({
      orderId: order._id,
      isPaid: order.isPaid,
      isDelivered: order.isDelivered,
      timeline: buildTrackingTimeline(order)
    })
  } catch (e) {
    next(e)
  }
})

// GET /api/orders/:id
router.get('/:id', protect, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
    if (!order) {
      res.status(404)
      return next(new Error('Order not found'))
    }
    res.json(order)
  } catch (e) {
    next(e)
  }
})

// POST /api/orders/:id/create-payment-intent
router.post('/:id/create-payment-intent', protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) {
      res.status(404)
      return next(new Error('Order not found'))
    }
    
    // Total price is usually stored in INR (or base currency), stripe expects smallest currency unit (paise)
    const amountInCents = Math.round(order.totalPrice * 100)
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'inr',
      metadata: { order_id: order._id.toString() }
    })
    
    res.json({ clientSecret: paymentIntent.client_secret })
  } catch(e) {
    next(e)
  }
})

// PUT /api/orders/:id/pay
router.put('/:id/pay', protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) {
      res.status(404)
      return next(new Error('Order not found'))
    }
    
    order.isPaid = true
    order.paidAt = Date.now()
    
    const updatedOrder = await order.save()

    const buyer = await User.findById(order.user).select('name email')
    if (buyer) {
      sendOrderConfirmationEmail(buyer, updatedOrder).catch((err) => {
        console.error('Order confirmation email failed:', err?.message || err)
      })
    }

    res.json(updatedOrder)
  } catch(e) {
    next(e)
  }
})

// POST /api/orders
// Body supports:
// - shippingAddress, paymentMethod
// - or orderItems/itemsPrice/taxPrice/shippingPrice/totalPrice
// If orderItems not provided, it will place an order from the user's cart.
router.post('/', protect, async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod } = req.body || {}
    let { orderItems, itemsPrice, taxPrice, shippingPrice, totalPrice } = req.body || {}

    if (!orderItems || orderItems.length === 0) {
      const cart = await Cart.findOne({ user: req.user._id })
      if (!cart || cart.items.length === 0) {
        res.status(400)
        return next(new Error('Cart is empty'))
      }
      orderItems = cart.items.map((i) => ({
        product: i.product,
        name: i.name,
        price: i.price,
        qty: i.qty
      }))
      itemsPrice = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0)
      shippingPrice = itemsPrice >= 75 ? 0 : 10
      if (cart.coupon?.discountType === 'shipping') {
        shippingPrice = 0
      }
      taxPrice = Number((itemsPrice * 0.1).toFixed(2))
      let discount = 0
      if (cart.coupon?.discountType === 'percent') {
        discount = Number(((itemsPrice * cart.coupon.discountValue) / 100).toFixed(2))
      } else if (cart.coupon?.discountType === 'flat') {
        discount = Number(Math.min(itemsPrice, cart.coupon.discountValue).toFixed(2))
      }
      totalPrice = Number((itemsPrice + shippingPrice + taxPrice).toFixed(2))
      if (discount > 0) {
        totalPrice = Number(Math.max(0, totalPrice - discount).toFixed(2))
      }
    }

    const productIds = (orderItems || []).map((item) => item.product).filter(Boolean)
    const products = await Product.find({ _id: { $in: productIds } }).select('_id countInStock name').lean().exec()
    const productById = new Map(products.map((p) => [String(p._id), p]))

    for (const item of orderItems || []) {
      const product = productById.get(String(item.product))
      if (!product) {
        res.status(400)
        return next(new Error(`Product not found for item: ${item.name || 'Unknown'}`))
      }
      const requestedQty = Number(item.qty || 0)
      if (requestedQty <= 0) {
        res.status(400)
        return next(new Error(`Invalid quantity for ${product.name || item.name || 'product'}`))
      }
      if (Number(product.countInStock || 0) < requestedQty) {
        res.status(400)
        return next(new Error(`Insufficient quantity for ${product.name || item.name || 'product'}`))
      }
    }

    const order = await Order.create({
      user: req.user._id,
      orderItems,
      shippingAddress: shippingAddress || {},
      paymentMethod: paymentMethod || 'card',
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice
    })

    const bulkStockUpdates = (orderItems || []).map((item) => ({
      updateOne: {
        filter: { _id: item.product, countInStock: { $gte: Number(item.qty || 0) } },
        update: { $inc: { countInStock: -Number(item.qty || 0) } }
      }
    }))
    const stockUpdateResult = await Product.bulkWrite(bulkStockUpdates)
    if (stockUpdateResult.modifiedCount !== bulkStockUpdates.length) {
      await Order.deleteOne({ _id: order._id })
      res.status(400)
      return next(new Error('Stock changed during checkout. Please review cart quantities and try again.'))
    }

    // Clear cart after order creation (simple flow)
    await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { items: [] } })

    res.status(201).json(order)
  } catch (e) {
    next(e)
  }
})

module.exports = router





