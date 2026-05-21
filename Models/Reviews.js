const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Manufacturer/Labor
    rating: { type: Number, required: true }, // 1 to 5
    comment: { type: String, required: true },
    
    // AI Analysis Fields (multilingual sentiment)
    sentimentScore: { type: Number }, // 0–100 sentiment-only signal from model distribution
    sentimentLabel: { type: String }, // top label e.g. positive / neutral / negative
    combinedScore: { type: Number }, // rating + sentiment merged (0–100), used for trust average

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);