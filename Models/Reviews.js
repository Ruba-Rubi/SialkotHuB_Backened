const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Manufacturer/Labor
    rating: { type: Number, required: true }, // 1 to 5
    comment: { type: String, required: true },
    
    // AI Analysis Fields
    sentimentScore: { type: Number }, // Positive ya Negative value
    sentimentLabel: { type: String }, // 'Positive', 'Negative' ya 'Neutral'
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);