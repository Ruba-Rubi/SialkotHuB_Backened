const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Manufacturer', 'Labour', 'client', 'Admin'], required: true },
    
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
    
    // R_Back/models/Users.js mein dekhein ye fields hain?
    trustScore: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    verificationStatus: { type: String, default: "PENDING" },
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
cnic: String,
dob: String,
isVerified: {
  type: Boolean,
  default: false
},
trustScore: {
  type: Number,
  default: 0
},
verificationStatus: {
  type: String,
  default: 'PENDING'
},
cnicVerification: {
  type: Object,
  default: null
},

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);