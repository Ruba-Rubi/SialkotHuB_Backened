const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: String,
  receiverId: String,
  message: String,
  sentiment: String,
  flagged: Boolean
});

module.exports = mongoose.model("Message", messageSchema);