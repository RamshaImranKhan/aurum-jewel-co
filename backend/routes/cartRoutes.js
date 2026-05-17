const express = require('express')
const Cart = require('../models/Cart')
const Product = require('../models/Product')
const { protect } = require('../middleware/authMiddleware')

const router = express.Router()
const COUPONS = {
  SAVE10: { discountType: 'percent', discountValue: 10 },
  FLAT5: { discountType: 'flat', discountValue: 5 },
  FREESHIP: { discountType: 'shipping', discountValue: 100 }
}

// GET /api/cart
router.get('/', protect, async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
    res.json(cart || { user: req.user._id, items: [] })
  } catch (e) {
    next(e)
  }
})

// POST /api/cart { productId, quantity }
router.post('/', protect, async (req, res, next) => {
  try {
    const { productId, quantity } = req.body || {}
    if (!productId) {
      res.status(400)
      return next(new Error('productId is required'))
    }
    const qty = Math.max(1, Number(quantity || 1))

    const product = await Product.findById(productId)
    if (!product) {
      res.status(404)
      return next(new Error('Product not found'))
    }

    const cart = (await Cart.findOne({ user: req.user._id })) || (await Cart.create({ user: req.user._id, items: [] }))
    const existing = cart.items.find((i) => String(i.product) === String(product._id))
    if (existing) {
      existing.qty += qty
    } else {
      cart.items.push({
        product: product._id,
        name: product.name,
        price: product.price,
        image: product.images && product.images.length > 0 ? product.images[0] : '',
        qty
      })
    }

    await cart.save()
    res.status(201).json(cart)
  } catch (e) {
    next(e)
  }
})

// PUT /api/cart/:itemId { quantity }
router.put('/:itemId', protect, async (req, res, next) => {
  try {
    const qty = Math.max(1, Number((req.body || {}).quantity || 1))
    const cart = await Cart.findOne({ user: req.user._id })
    if (!cart) {
      res.status(404)
      return next(new Error('Cart not found'))
    }

    const item = cart.items.id(req.params.itemId)
    if (!item) {
      res.status(404)
      return next(new Error('Cart item not found'))
    }

    item.qty = qty
    await cart.save()
    res.json(cart)
  } catch (e) {
    next(e)
  }
})

// DELETE /api/cart/:itemId
router.delete('/:itemId', protect, async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
    if (!cart) {
      res.status(404)
      return next(new Error('Cart not found'))
    }
    const item = cart.items.id(req.params.itemId)
    if (!item) {
      res.status(404)
      return next(new Error('Cart item not found'))
    }
    item.deleteOne()
    await cart.save()
    res.json(cart)
  } catch (e) {
    next(e)
  }
})

// DELETE /api/cart (clear)
router.delete('/', protect, async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
    if (!cart) return res.json({ user: req.user._id, items: [] })
    cart.items = []
    await cart.save()
    res.json(cart)
  } catch (e) {
    next(e)
  }
})

// POST /api/cart/coupon { code }
router.post('/coupon', protect, async (req, res, next) => {
  try {
    const code = String(req.body?.code || '').trim().toUpperCase()
    const coupon = COUPONS[code]
    if (!coupon) {
      res.status(400)
      return next(new Error('Invalid coupon code'))
    }

    const cart = (await Cart.findOne({ user: req.user._id })) || (await Cart.create({ user: req.user._id, items: [] }))
    cart.coupon = { code, ...coupon }
    await cart.save()
    res.json(cart)
  } catch (e) {
    next(e)
  }
})

// DELETE /api/cart/coupon
router.delete('/coupon', protect, async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
    if (!cart) return res.json({ user: req.user._id, items: [], coupon: { code: '', discountType: 'none', discountValue: 0 } })
    cart.coupon = { code: '', discountType: 'none', discountValue: 0 }
    await cart.save()
    res.json(cart)
  } catch (e) {
    next(e)
  }
})

module.exports = router





