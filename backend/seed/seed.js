const dotenv = require('dotenv')
const loadEnvFromJson = require('../config/loadEnv')
const connectDB = require('../config/db')
const Product = require('../models/Product')
const User = require('../models/User')
const products = require('../data/jewelryProducts')

dotenv.config()
loadEnvFromJson()

async function seed() {
  await connectDB()
  await Product.deleteMany({})
  await User.deleteMany({})

  await User.create({
    name: 'Admin User',
    email: 'admin@admin.com',
    password: 'password', // will be hashed by pre-save middleware
    isAdmin: true
  })

  console.log('Admin user seeded')

  await Product.insertMany(products)
  console.log(`Seeded ${products.length} products`)
  process.exit(0)
}

seed().catch((e) => {
  console.error('Seeding failed:', e)
  process.exit(1)
})





