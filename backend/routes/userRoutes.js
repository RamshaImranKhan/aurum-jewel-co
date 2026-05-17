const express = require('express')
const User = require('../models/User')
const { protect, admin } = require('../middleware/authMiddleware')

const router = express.Router()

// GET /api/users
router.get('/', protect, admin, async (req, res, next) => {
  try {
    const users = await User.find({})
    res.json(users)
  } catch (e) {
    next(e)
  }
})

// DELETE /api/users/:id
router.delete('/:id', protect, admin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      res.status(404)
      return next(new Error('User not found'))
    }
    if (user.isAdmin) {
      res.status(400)
      return next(new Error('Cannot delete admin user'))
    }
    await User.deleteOne({ _id: user._id })
    res.json({ message: 'User removed' })
  } catch (e) {
    next(e)
  }
})

// GET /api/users/profile
router.get('/profile', protect, async (req, res, next) => {
  try {
    res.json(req.user)
  } catch (e) {
    next(e)
  }
})

// PUT /api/users/profile
router.put('/profile', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      res.status(404)
      return next(new Error('User not found'))
    }

    const { name, email, password, phone, address } = req.body || {}
    if (name) user.name = String(name).trim()
    if (email) user.email = String(email).toLowerCase().trim()
    if (password) user.password = String(password)
    if (phone != null) user.phone = String(phone).trim()
    if (address && typeof address === 'object') {
      user.address = {
        address: address.address != null ? String(address.address).trim() : user.address.address,
        city: address.city != null ? String(address.city).trim() : user.address.city,
        zipCode: address.zipCode != null ? String(address.zipCode).trim() : user.address.zipCode,
        country: address.country != null ? String(address.country).trim() : user.address.country
      }
    }

    await user.save()
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      isAdmin: user.isAdmin
    })
  } catch (e) {
    next(e)
  }
})

module.exports = router


