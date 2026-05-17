const express = require('express')
const Product = require('../models/Product')
const { protect, admin } = require('../middleware/authMiddleware')
const { GoogleGenAI } = require('@google/genai')

const router = express.Router()

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function tokenizeSearch(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function cleanJsonPayload(textPayload) {
  return String(textPayload || '').replace(/```json/g, '').replace(/```/g, '').trim()
}

function parseSeoJsonPayload(rawText) {
  const cleaned = cleanJsonPayload(rawText)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()

  const candidates = [cleaned]
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(cleaned.slice(firstBrace, lastBrace + 1))
  }

  for (const text of candidates) {
    if (!text) continue
    try {
      return JSON.parse(text)
    } catch {
      try {
        // Best-effort cleanup for common model output mistakes.
        const repaired = text
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
        return JSON.parse(repaired)
      } catch {
        // try next candidate
      }
    }
  }

  throw new Error('AI returned non-JSON SEO payload')
}

function buildFallbackSeo({ name, category, metal, description }) {
  const safeName = String(name || 'Jewellery Piece').trim()
  const safeCategory = String(category || 'Jewellery').trim()
  const safeMetal = String(metal || 'premium').trim()
  const descSource = String(description || '').trim()
  const metaTitle = `${safeName} | ${safeCategory} at Aurum Jewel Co.`
  const generatedDescription = (
    descSource ||
    `Shop ${safeName} crafted in ${safeMetal}. Discover elegant ${safeCategory.toLowerCase()} at Aurum Jewel Co.`
  )
  const metaDescription = generatedDescription.slice(0, 160)
  const metaKeywords = `${safeName}, ${safeCategory}, ${safeMetal}, Aurum Jewel Co, jewellery online`
  return { metaTitle, metaDescription, metaKeywords, description: generatedDescription }
}

async function generateSeoForProduct({ ai, name, category, description, metal }) {
  const prompt = `
    You are an expert SEO specialist for a luxury jewelry e-commerce store called Aurum Jewel Co.
    Generate on-page SEO metadata for the following product:

    Name: ${name || 'N/A'}
    Category: ${category || 'N/A'}
    Metal: ${metal || 'N/A'}
    Description: ${description || 'N/A'}

    Return ONLY a raw JSON object (without markdown blocks like \`\`\`json) with the following exactly matching keys:
    {
      "metaTitle": "A compelling title (50-60 characters)",
      "metaDescription": "A highly clickable description (150-160 characters)",
      "metaKeywords": "comma, separated, relevant, keywords",
      "description": "A polished product description for customers (2-3 sentences)"
    }
  `

  const strictPrompt = `
Return ONLY valid minified JSON object with keys: metaTitle, metaDescription, metaKeywords, description.
No markdown, no comments, no extra text.
Product:
Name: ${name || 'N/A'}
Category: ${category || 'N/A'}
Metal: ${metal || 'N/A'}
Description: ${description || 'N/A'}
`

  const prompts = [prompt, strictPrompt]
  for (const currentPrompt of prompts) {
    try {
      const aiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: currentPrompt
      })
      const seoData = parseSeoJsonPayload(aiResponse.text || '')
      const normalized = {
        metaTitle: String(seoData.metaTitle || '').trim(),
        metaDescription: String(seoData.metaDescription || '').trim(),
        metaKeywords: String(seoData.metaKeywords || '').trim(),
        description: String(seoData.description || '').trim()
      }
      if (normalized.metaTitle && normalized.metaDescription && normalized.metaKeywords) {
        return normalized
      }
    } catch {
      // Try next prompt variant.
    }
  }

  return buildFallbackSeo({ name, category, metal, description })
}

// GET /api/products
// Supports: ?search=&category=&brand=&minPrice=&maxPrice=&minRating=&sort=
router.get('/', async (req, res, next) => {
  try {
    const { search, category, brand, minPrice, maxPrice, minRating, sort, prefix } = req.query

    const filter = {}
    if (category) filter.category = { $regex: `^${escapeRegex(category)}$`, $options: 'i' }
    if (brand) filter.brand = { $regex: String(brand), $options: 'i' }
    if (minPrice || maxPrice) {
      filter.price = {}
      if (minPrice) filter.price.$gte = Number(minPrice)
      if (maxPrice) filter.price.$lte = Number(maxPrice)
    }
    if (minRating) filter.rating = { $gte: Number(minRating) }
    if (search) {
      const q = String(search).trim()
      if (prefix === 'true') {
        filter.$or = [
          { name: { $regex: q, $options: 'i' } }
        ]
      } else {
        filter.$or = [
          { name: { $regex: q, $options: 'i' } },
          { category: { $regex: q, $options: 'i' } },
          { brand: { $regex: q, $options: 'i' } },
          { metal: { $regex: q, $options: 'i' } },
          { gemstone: { $regex: q, $options: 'i' } }
        ]
      }
    }

    let query = Product.find(filter)
    switch (sort) {
      case 'price-low':
        query = query.sort({ price: 1 })
        break
      case 'price-high':
        query = query.sort({ price: -1 })
        break
      case 'rating':
        query = query.sort({ rating: -1 })
        break
      default:
        query = query.sort({ createdAt: -1 })
    }

    const products = await query.exec()
    res.json(products)
  } catch (e) {
    next(e)
  }
})

// GET /api/products/suggestions?query=
router.get('/suggestions', async (req, res, next) => {
  try {
    const query = String(req.query.query || '').trim()
    if (!query) return res.json([])
    const rows = await Product.find({
      name: { $regex: query, $options: 'i' }
    })
      .select('name category price rating')
      .limit(8)
      .lean()
      .exec()
    const suggestions = rows.map((r) => ({
      id: r._id,
      label: r.name,
      category: r.category,
      price: r.price,
      rating: r.rating
    }))
    res.json(suggestions)
  } catch (e) {
    next(e)
  }
})

// GET /api/products/recommendations
// Supports ?seedProductId=&limit=
router.get('/recommendations', async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(24, Number(req.query.limit || 8)))
    const { seedProductId } = req.query

    let products = []
    if (seedProductId) {
      const seed = await Product.findById(seedProductId).lean().exec()
      if (seed) {
        const preferredTerms = tokenizeSearch(`${seed.category} ${seed.metal} ${seed.gemstone}`)
        const query = preferredTerms.length
          ? {
              _id: { $ne: seed._id },
              $or: preferredTerms.map((t) => ({
                $or: [
                  { category: { $regex: t, $options: 'i' } },
                  { metal: { $regex: t, $options: 'i' } },
                  { gemstone: { $regex: t, $options: 'i' } },
                  { name: { $regex: t, $options: 'i' } }
                ]
              }))
            }
          : { _id: { $ne: seed._id } }

        products = await Product.find(query)
          .sort({ rating: -1, reviews: -1, createdAt: -1 })
          .limit(limit)
          .lean()
          .exec()
      }
    }

    if (!products.length) {
      products = await Product.find({})
        .sort({ rating: -1, reviews: -1, createdAt: -1 })
        .limit(limit)
        .lean()
        .exec()
    }
    res.json(products)
  } catch (e) {
    next(e)
  }
})

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      res.status(404)
      return next(new Error('Product not found'))
    }
    res.json(product)
  } catch (e) {
    next(e)
  }
})

// POST /api/products/generate-seo (Admin only)
router.post('/generate-seo', protect, admin, async (req, res, next) => {
  try {
    const { name, category, description, metal } = req.body

    const geminiKey = String(process.env.GEMINI_API_KEY || '').trim()
    if (!geminiKey || geminiKey === 'PASTE_YOUR_GEMINI_API_KEY_HERE') {
      const fallback = buildFallbackSeo({ name, category, metal, description })
      return res.json({ ...fallback, source: 'fallback' })
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey })
    const seoData = await generateSeoForProduct({ ai, name, category, description, metal })
    return res.json({ ...seoData, source: 'ai' })
  } catch (e) {
    console.error('GenAI error (single product SEO), returning fallback:', e)
    const { name, category, description, metal } = req.body || {}
    const fallback = buildFallbackSeo({ name, category, metal, description })
    return res.json({ ...fallback, source: 'fallback' })
  }
})

// POST /api/products/generate-seo/bulk (Admin only)
// Body (optional): { onlyMissing: true }
router.post('/generate-seo/bulk', protect, admin, async (req, res) => {
  try {
    const onlyMissing = req.body?.onlyMissing !== false
    const geminiKey = String(process.env.GEMINI_API_KEY || '').trim()
    const canUseAI = Boolean(geminiKey && geminiKey !== 'PASTE_YOUR_GEMINI_API_KEY_HERE')
    const ai = canUseAI ? new GoogleGenAI({ apiKey: geminiKey }) : null

    const query = onlyMissing
      ? {
          $or: [
            { metaTitle: { $exists: false } },
            { metaTitle: '' },
            { metaDescription: { $exists: false } },
            { metaDescription: '' },
            { metaKeywords: { $exists: false } },
            { metaKeywords: '' }
          ]
        }
      : {}

    const products = await Product.find(query).select('name category description metal metaTitle metaDescription metaKeywords')
    if (!products.length) {
      return res.json({ message: 'No products need SEO generation.', total: 0, updated: 0, failed: 0, failedProducts: [] })
    }

    let updated = 0
    let failed = 0
    const failedProducts = []

    for (const product of products) {
      try {
        const seoData = canUseAI
          ? await generateSeoForProduct({
              ai,
              name: product.name,
              category: product.category,
              description: product.description,
              metal: product.metal
            })
          : buildFallbackSeo({
              name: product.name,
              category: product.category,
              description: product.description,
              metal: product.metal
            })
        product.metaTitle = seoData.metaTitle
        product.metaDescription = seoData.metaDescription
        product.metaKeywords = seoData.metaKeywords
        if (!String(product.description || '').trim() && seoData.description) {
          product.description = seoData.description
        }
        await product.save()
        updated += 1
      } catch (e) {
        failed += 1
        failedProducts.push({ id: product._id, name: product.name, reason: e?.message || 'Generation failed' })
      }
    }

    return res.json({
      message: `Bulk SEO generation completed using ${canUseAI ? 'AI/fallback hybrid' : 'fallback mode'}.`,
      total: products.length,
      updated,
      failed,
      failedProducts
    })
  } catch (e) {
    console.error('Bulk GenAI SEO error:', e)
    return res.status(500).json({ message: 'Error running bulk AI SEO generation.' })
  }
})

// POST /api/products (Admin only)
router.post('/', protect, admin, async (req, res, next) => {
  try {
    const product = new Product({
      name: 'Sample Product',
      price: 0,
      originalPrice: 0,
      category: 'Sample Category',
      countInStock: 0,
      description: 'Sample description',
      metal: 'Sample metal',
      gemstone: 'Sample gemstone',
      hallmark: 'Sample hallmark',
      features: [],
      images: [],
      metaTitle: '',
      metaDescription: '',
      metaKeywords: ''
    })
    const createdProduct = await product.save()
    res.status(201).json(createdProduct)
  } catch (e) {
    next(e)
  }
})

// PUT /api/products/:id (Admin only)
router.put('/:id', protect, admin, async (req, res, next) => {
  try {
    const {
      name,
      price,
      originalPrice,
      category,
      countInStock,
      description,
      metal,
      gemstone,
      hallmark,
      features,
      images,
      metaTitle,
      metaDescription,
      metaKeywords
    } = req.body

    const product = await Product.findById(req.params.id)
    if (product) {
      product.name = name ?? product.name
      product.price = price ?? product.price
      product.originalPrice = originalPrice ?? product.originalPrice
      product.category = category ?? product.category
      product.countInStock = countInStock ?? product.countInStock
      product.description = description ?? product.description
      product.metal = metal ?? product.metal
      product.gemstone = gemstone ?? product.gemstone
      product.hallmark = hallmark ?? product.hallmark
      product.features = features ?? product.features
      product.images = images ?? product.images
      product.metaTitle = metaTitle ?? product.metaTitle
      product.metaDescription = metaDescription ?? product.metaDescription
      product.metaKeywords = metaKeywords ?? product.metaKeywords

      const updatedProduct = await product.save()
      res.json(updatedProduct)
    } else {
      res.status(404)
      return next(new Error('Product not found'))
    }
  } catch (e) {
    next(e)
  }
})

// DELETE /api/products/:id (Admin only)
router.delete('/:id', protect, admin, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
    if (product) {
      await Product.deleteOne({ _id: product._id })
      res.json({ message: 'Product removed' })
    } else {
      res.status(404)
      return next(new Error('Product not found'))
    }
  } catch (e) {
    next(e)
  }
})

module.exports = router





