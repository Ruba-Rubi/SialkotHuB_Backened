const mongoose = require("mongoose");

const escrowSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"   // fixed: matches mongoose.model('User', ...)
  },
  manufacturerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"   // fixed: matches mongoose.model('User', ...)
  },
  totalAmount: { type: Number, required: true },
  advanceAmount: Number,
  remainingAmount: Number,
  status: {
    type: String,
    enum: ["pending", "awaiting_payment", "paid", "advance_released", "approved", "released", "disputed"],
    default: "pending"
  },
  jazzcashTxnRef: { type: String, default: null },
  stripeSessionId: { type: String, default: null },
  advanceReleased: { type: Boolean, default: false },
  remainingReleased: { type: Boolean, default: false },
  clientApproved: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.models.Escrow || mongoose.model("Escrow", escrowSchema);