const mongoose = require('mongoose')

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, default: '' },
    qty: { type: Number, required: true, min: 1 }
  },
  { timestamps: false }
)

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [cartItemSchema],
    coupon: {
      code: { type: String, default: '' },
      discountType: { type: String, enum: ['none', 'percent', 'flat', 'shipping'], default: 'none' },
      discountValue: { type: Number, default: 0 }
    },
    cartReminderSentAt: { type: Date, default: null }
  },
  { timestamps: true }
)

module.exports = mongoose.model('Cart', cartSchema)





