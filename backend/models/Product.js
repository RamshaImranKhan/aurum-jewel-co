const mongoose = require('mongoose')

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    brand: { type: String, default: '', trim: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number, required: true },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    metal: { type: String, default: '' },
    gemstone: { type: String, default: '' },
    hallmark: { type: String, default: '' },
    description: { type: String, default: '' },
    features: [{ type: String }],
    images: [{ type: String }],
    countInStock: { type: Number, default: 25 },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    metaKeywords: { type: String, default: '' }
  },
  { timestamps: true }
)

module.exports = mongoose.model('Product', productSchema)





