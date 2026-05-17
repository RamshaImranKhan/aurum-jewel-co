const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')
const loadEnvFromJson = require('./config/loadEnv')
const { sanitizeEnv } = require('./config/sanitizeEnv')
const { notFound, errorHandler } = require('./middleware/errorMiddleware')
const requireDb = require('./middleware/requireDb')
const lazyRoute = require('./utils/lazyRoute')

dotenv.config()
loadEnvFromJson()
sanitizeEnv()

mongoose.set('bufferCommands', false)

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
    const mongoUriConfigured = Boolean(process.env.MONGO_URI)
    res.status(200).json({
      ok: dbReady,
      service: 'aurum-jewel-backend',
      mongo: dbReady ? 'connected' : 'pending',
      mongoUriConfigured,
      hint: !mongoUriConfigured
        ? 'Add MONGO_URI in Railway → Variables (copy from backend/env.local.json), then redeploy.'
        : dbReady
          ? null
          : 'Check MongoDB Atlas Network Access allows 0.0.0.0/0 and credentials are correct.'
    })
  })

  app.use('/api/auth', requireDb, lazyRoute('./routes/authRoutes'))
  app.use('/api/products', requireDb, lazyRoute('./routes/productRoutes'))
  app.use('/api/chat', requireDb, lazyRoute('./routes/chatRoutes'))
  app.use('/api/users', requireDb, lazyRoute('./routes/userRoutes'))
  app.use('/api/cart', requireDb, lazyRoute('./routes/cartRoutes'))
  app.use('/api/orders', requireDb, lazyRoute('./routes/orderRoutes'))
  app.use('/api/admin', requireDb, lazyRoute('./routes/adminRoutes'))
  app.use('/', lazyRoute('./routes/seoRoutes'))

  app.get('/api/config/stripe', (req, res) => {
    res.send({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' })
  })

  app.use(notFound)
  app.use(errorHandler)

  return app
}

module.exports = createApp
