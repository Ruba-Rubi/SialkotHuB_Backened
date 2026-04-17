const mongoose = require('mongoose');

const escrowSchema = new mongoose.Schema({
  orderId: String,
  amount: Number,
  status: { type: String, default: "held" }
});

module.exports = mongoose.model("Escrow", escrowSchema);