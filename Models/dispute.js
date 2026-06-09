const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  orderId: String,
  raisedBy: String,
  reason: String,
  status: { type: String, default: "open" },
  warningCount: { type: Number, default: 0 },
  adminNotified: { type: Boolean, default: false },
  aiStatus: { type: String, default: 'UNKNOWN' },
  aiConfidence: { type: String, default: 'N/A' }
});

module.exports = mongoose.model("Dispute", disputeSchema);