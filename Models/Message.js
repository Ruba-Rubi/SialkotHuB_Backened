const mongoose = require('mongoose');
 
const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  orderId: { type: String, required: true },
  conversationId: { type: String },
  message: { type: String, required: true },
  sentiment: { type: String, default: 'positive' },
  flagged: { type: Boolean, default: false },
  isFlagged: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
 
module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);