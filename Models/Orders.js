const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    orderNumber: { type: String, required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    manufacturerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gigId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig' },
    status: { type: String, enum: ['In Progress', 'Completed', 'Cancelled'], default: 'In Progress' },
    escrowStatus: { type: String, enum: ['Held', 'Released', 'Refunded'], default: 'Held' },
    financials: {
        totalAmount: Number,
        paidAmount: Number
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);