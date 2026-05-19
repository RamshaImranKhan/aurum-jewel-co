const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { sendWelcomeEmail } = require('../services/emailService')

const router = express.Router()

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body || {}
    if (!name || !email || !password) {
      res.status(400)
      return next(new Error('name, email, password are required'))
    }

    const existing = await User.findOne({ email: String(email).toLowerCase().trim() })
    if (existing) {
      res.status(400)
      return next(new Error('User already exists'))
    }

    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password: String(password),
      phone: phone ? String(phone).trim() : ''
    })

    sendWelcomeEmail(user).catch((err) => {
      console.error('Welcome email failed:', err?.message || err)
    })

    res.status(201).json({
      token: signToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin }
    })
  } catch (e) {
    next(e)
  }
})

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      res.status(400)
      return next(new Error('email and password are required'))
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() })
    if (!user) {
      res.status(401)
      return next(new Error('Invalid credentials'))
    }

    const ok = await user.matchPassword(String(password))
    if (!ok) {
      res.status(401)
      return next(new Error('Invalid credentials'))
    }

    res.json({
      token: signToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin }
    })
  } catch (e) {
    next(e)
  }
})

module.exports = router





