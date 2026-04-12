const mongoose = require('mongoose');

const GigSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String },
    basePrice: { type: Number },
    deliveryTime: { type: Number }, // In days
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Gig', GigSchema);