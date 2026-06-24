const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['client', 'labour', 'manufacturer', 'admin'], required: true },

  cnic:  { type: String },
  dob:   { type: String },
  phone: { type: String },

  address: {
    city:    { type: String, default: '' },
    full:    { type: String, default: '' },
  },

  // Type-specific
  companyName:    { type: String },  // client
  businessName:   { type: String },  // manufacturer
  factoryAddress: { type: String },  // manufacturer
  skills:         [{ type: String }], // labour
  experience:     { type: String },  // labour

  // Verification
  isVerified:         { type: Boolean, default: false },
  verificationStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'FAKE', 'MANUAL'], default: 'PENDING' },
  trustScore:         { type: Number, default: 0 },
  totalReviews:       { type: Number, default: 0 },
  cnicVerification:   { type: mongoose.Schema.Types.Mixed },

  // Account management
  accountStatus:    { type: String, enum: ['active', 'blocked', 'suspended'], default: 'active' },
  rejectionReason:  { type: String, default: '' },

  // Policies acceptance
  policiesAccepted:   { type: Boolean, default: false },

  // Chat moderation
  warningCount:  { type: Number, default: 0 },
  isChatLocked:  { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
