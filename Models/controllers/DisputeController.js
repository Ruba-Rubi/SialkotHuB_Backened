const Dispute = require('../dispute');
const Escrow = require('../escrow');
const axios = require('axios');

const BERT_API = 'http://localhost:5000/predict-dispute';

exports.createDispute = async (req, res) => {
  try {
    const { orderId, reason, raisedBy } = req.body;

    // BERT AI Analysis
    let aiStatus = 'UNKNOWN', aiConfidence = 'N/A';
    try {
      const aiRes = await axios.post(BERT_API, { message: reason });
      aiStatus = aiRes.data.status;
      aiConfidence = aiRes.data.confidence;
    } catch (aiErr) {
      console.warn('[BERT] AI service not reachable:', aiErr.message);
    }

    const dispute = await Dispute.create({ orderId, reason, raisedBy, aiStatus, aiConfidence });

    await Escrow.findOneAndUpdate({ orderId }, { status: 'disputed' });

    res.json({ message: 'Dispute created & escrow on hold', dispute, aiStatus, aiConfidence });
  } catch (error) {
    res.status(500).json({ message: 'Dispute create nahi hua', error: error.message });
  }
};

exports.resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision } = req.body;

    const dispute = await Dispute.findByIdAndUpdate(id, { status: 'resolved' }, { new: true });

    if (!dispute) return res.status(404).json({ message: 'Dispute nahi mila' });

    const escrow = await Escrow.findOne({ orderId: dispute.orderId });

    if (escrow) {
      escrow.status = decision === 'release' ? 'released' : 'pending';
      await escrow.save();
    }

    res.json({ message: 'Dispute resolved', dispute });
  } catch (error) {
    res.status(500).json({ message: 'Resolve nahi hua', error: error.message });
  }
};

exports.getAllDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.find();
    res.status(200).json(disputes);
  } catch (error) {
    res.status(500).json({ message: 'Saray disputes nahi mil sakay', error: error.message });
  }
};
