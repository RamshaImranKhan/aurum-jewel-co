const mongoose = require('mongoose')
const connectDB = require('./config/db')
const createApp = require('./app')

const PORT = Number(process.env.PORT || 5000)
const app = createApp()

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)

  connectDB()
    .then(() => console.log('MongoDB connected'))
    .catch((err) => {
      console.error('MongoDB connection error:', err?.message || err)
    })
})
