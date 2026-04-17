const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  orderId: String,
  raisedBy: String,
  reason: String,
  status: { type: String, default: "open" },
  warningCount: { type: Number, default: 0 }, // 🔥 AI tracking
  adminNotified: { type: Boolean, default: false }
});

module.exports = mongoose.model("Dispute", disputeSchema);