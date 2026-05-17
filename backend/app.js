const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')
const loadEnvFromJson = require('./config/loadEnv')
const { notFound, errorHandler } = require('./middleware/errorMiddleware')

dotenv.config()
loadEnvFromJson()

function getAllowedOrigins() {
  const fromEnv = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.SITE_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'https://aurum-jewel-co.vercel.app',
    'https://www.aurum-jewel-co.vercel.app'
  ]
    .filter(Boolean)
    .map((url) => String(url).replace(/\/$/, ''))
  return [...new Set(fromEnv)]
}

function createApp() {
  const app = express()
  const allowedOrigins = getAllowedOrigins()

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true)
        const normalized = String(origin).replace(/\/$/, '')
        if (allowedOrigins.includes(normalized) || process.env.NODE_ENV !== 'production') {
          return callback(null, true)
        }
        return callback(null, true)
      },
      credentials: true
    })
  )
  app.use(express.json())

  app.get('/', (req, res) => {
    res.json({ ok: true, service: 'aurum-jewel-backend', health: '/api/health' })
  })

  app.get('/api', (req, res) => {
    const dbReady = mongoose.connection.readyState === 1
    res.status(200).json({
      ok: true,
      service: 'aurum-jewel-backend',
      mongo: dbReady ? 'connected' : 'pending',
      message: 'API is running. Use /api/health, /api/products, /api/auth, etc.',
      endpoints: {
        health: '/api/health',
        products: '/api/products',
        auth: '/api/auth',
        cart: '/api/cart',
        orders: '/api/orders',
        chat: '/api/chat'
      }
    })
  })

  app.get('/api/health', (req, res) => {
    const dbReady = mongoose.connection.readyState === 1
    res.status(200).json({
      ok: true,
      service: 'aurum-jewel-backend',
      mongo: dbReady ? 'connected' : 'pending'
    })
  })

  app.use('/api/auth', require('./routes/authRoutes'))
  app.use('/api/products', require('./routes/productRoutes'))
  app.use('/api/chat', require('./routes/chatRoutes'))
  app.use('/api/users', require('./routes/userRoutes'))
  app.use('/api/cart', require('./routes/cartRoutes'))
  app.use('/api/orders', require('./routes/orderRoutes'))
  app.use('/api/admin', require('./routes/adminRoutes'))
  app.use('/', require('./routes/seoRoutes'))

  app.get('/api/config/stripe', (req, res) => {
    res.send({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' })
  })

  app.use(notFound)
  app.use(errorHandler)

  return app
}

module.exports = createApp
