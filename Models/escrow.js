const mongoose = require("mongoose");

const escrowSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Orders"
  },
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

module.exports = mongoose.model("Escrow", escrowSchema);