const mongoose = require("mongoose");

const escrowSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users"
  },
  manufacturerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users"
  },
  totalAmount: {
    type: Number,
    required: true
  },
  advanceAmount: Number,
  remainingAmount: Number,
  status: {
    type: String,
    enum: ["pending", "paid", "approved", "released", "disputed"],
    default: "pending"
  },
  advanceReleased: { type: Boolean, default: false },
  remainingReleased: { type: Boolean, default: false },
  clientApproved: { type: Boolean, default: false }  // ✅ NEW: Client final approval
}, { timestamps: true });

module.exports = mongoose.models.Escrow || mongoose.model("Escrow", escrowSchema);