const mongoose = require('mongoose')

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, trim: true, index: true },
    userMessage: { type: String, required: true, trim: true },
    assistantReply: { type: String, required: true, trim: true },
    provider: { type: String, default: 'fallback' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    metadata: {
      ip: { type: String, default: '' },
      userAgent: { type: String, default: '' }
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model('ChatMessage', chatMessageSchema)

