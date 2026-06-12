const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // linked order
    reviewerRole: { type: String, enum: ['client', 'Manufacturer', 'Labour'] }, // who is reviewing
    rating: { type: Number, required: true }, // 1 to 5
    comment: { type: String, required: true },

    // AI Analysis Fields (multilingual sentiment)
    sentimentScore: { type: Number },   // 0–100 from model
    sentimentLabel: { type: String },   // positive / neutral / negative
    combinedScore:  { type: Number },   // rating + sentiment merged (0–100)

    createdAt: { type: Date, default: Date.now }
});

// One review per reviewer per order
reviewSchema.index({ reviewer: 1, orderId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Review', reviewSchema);
