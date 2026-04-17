const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Manufacturer', 'Labor', 'Client', 'Admin'], required: true },
    
    // Manufacturer specific
    companyName: { type: String },
    trustScore: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },


    // Labor specific
    skills: [{ type: String }],
    hourlyRate: { type: Number },
    availability: { type: String },

    // Admin specific
    permissions: [{ type: String }],

    // Common Objects
    address: { 
        city: String, 
        country: String, 
        details: String 
    },
    verification: { 
        isVerified: { type: Boolean, default: false },
        method: String,
        status: String
    },
    wallet: { 
        balance: { type: Number, default: 0 },
        currency: { type: String, default: "PKR" }
    },
    escrowBalance: {
    type: Number,
    default: 0
},

pendingWithdrawals: {
    type: Number,
    default: 0
},

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);