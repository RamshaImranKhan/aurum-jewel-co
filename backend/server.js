const connectDB = require('./config/db')
const createApp = require('./app')

const PORT = process.env.PORT || 5000

connectDB()
  .then(() => {
    const app = createApp()
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
  })
  .catch((err) => {
    console.error('Failed to connect DB', err)
    process.exit(1)
  })
