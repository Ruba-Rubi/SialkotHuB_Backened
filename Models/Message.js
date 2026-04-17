const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: { type: String, required: true },
    receiver: { type: String, required: true },
    orderId: { type: String, required: true },
    message: { type: String, required: true }, // <--- Yahan comma hona chahiye tha
    
    // AI Guardian Field
    isFlagged: { type: Boolean, default: false }, // <--- Yahan bhi comma laga diya hai
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);