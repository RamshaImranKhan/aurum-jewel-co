const mongoose = require('mongoose')

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function connectDB() {
  const uri = String(process.env.MONGO_URI || '').trim().replace(/^["']|["']$/g, '')
  if (!uri) {
    throw new Error('MONGO_URI is missing in environment variables')
  }

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    mongoose.set('strictQuery', true)
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10
    }).then((m) => {
      console.log('MongoDB connected')
      return m
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}

module.exports = connectDB
