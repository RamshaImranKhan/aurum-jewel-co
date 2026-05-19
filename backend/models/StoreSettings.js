const mongoose = require('mongoose')

const storeSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'payment', unique: true },
    bankAccountTitle: { type: String, default: '' },
    bankName: { type: String, default: '' },
    bankAccountNumber: { type: String, default: '' },
    bankIban: { type: String, default: '' },
    bankBranch: { type: String, default: '' },
    jazzcashNumber: { type: String, default: '' },
    jazzcashAccountTitle: { type: String, default: '' },
    easypaisaNumber: { type: String, default: '' },
    easypaisaAccountTitle: { type: String, default: '' }
  },
  { timestamps: true }
)

module.exports = mongoose.model('StoreSettings', storeSettingsSchema)
