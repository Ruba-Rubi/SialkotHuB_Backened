const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title:   { type: String, required: true },
  message: { type: String, required: true },
  type:    { type: String, default: 'system' }, // registration | document | video | system
  userId:  { type: String, default: null },
  orderId: { type: String, default: null },
  isRead:  { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
