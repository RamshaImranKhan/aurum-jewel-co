const connectDB = require('./config/db')
const createApp = require('./app')

const PORT = Number(process.env.PORT) || 5000

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err?.message || err)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err?.message || err)
})

async function start() {
  const app = createApp()

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (Railway PORT=${process.env.PORT || 'not set'})`)
  })

  if (!process.env.MONGO_URI) {
    console.error(
      'MONGO_URI is not set. Products and auth will not work until you add it in Railway Variables.'
    )
    return
  }

  connectDB()
    .then(() => console.log('MongoDB connected'))
    .catch((err) => {
      console.error('MongoDB connection error:', err?.message || err)
    })
}

start().catch((err) => {
  console.error('Failed to start server:', err?.message || err)
  process.exit(1)
})
