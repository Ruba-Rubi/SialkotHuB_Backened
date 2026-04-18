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
    enum: ["pending", "paid", "released", "disputed"],
    default: "pending"
  }
}, { timestamps: true });

module.exports = mongoose.models.Escrow || mongoose.model("Escrow", escrowSchema);