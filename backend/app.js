const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const loadEnvFromJson = require('./config/loadEnv')
const { notFound, errorHandler } = require('./middleware/errorMiddleware')

dotenv.config()
loadEnvFromJson()

function createApp() {
  const app = express()

  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json())

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'aurum-jewel-backend' })
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
