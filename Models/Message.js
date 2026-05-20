const mongoose = require('mongoose');

// Schema design for Skillora Messages
const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  message: { type: String, required: true },
  sentiment: { type: String, default: 'positive' },
  flagged: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Bilkul safe export bina kisi schema error ke
module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);