const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender:         { type: String, required: true },
  receiver:       { type: String, required: true },
  orderId:        { type: String, required: true },
  message:        { type: String, required: true },
  sentiment:      { type: String, enum: ['positive', 'negative'], default: 'positive' },
  flagged:        { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.models.Message || mongoose.model('Message', MessageSchema);
