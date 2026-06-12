const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  title:          { type: String, required: true },
  description:    { type: String },
  category:       { type: String },
  quantity:       { type: Number, required: true },
  budget:         { type: Number, required: true },
  deadline:       { type: String, required: true },
  specifications: { type: String },
  clientId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  manufacturerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  labourId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetRole:     { type: String, enum: ['Manufacturer', 'Labour'], default: 'Manufacturer' },
  status:         { type: String, enum: ['pending', 'in-progress', 'completed', 'cancelled', 'disputed'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
