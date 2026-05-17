const serverless = require('serverless-http')
const connectDB = require('../backend/config/db')
const createApp = require('../backend/app')

let handler

module.exports = async (req, res) => {
  if (!handler) {
    await connectDB()
    const app = createApp()
    handler = serverless(app)
  }
  return handler(req, res)
}
