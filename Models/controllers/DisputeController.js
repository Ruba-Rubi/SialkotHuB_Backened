const Dispute = require('../dispute');
const Escrow = require('../escrow');

exports.createDispute = async (req, res) => {
  const { orderId, reason, raisedBy } = req.body;

  const dispute = await Dispute.create({
    orderId,
    reason,
    raisedBy
  });

  await Escrow.findOneAndUpdate(
    { orderId },
    { status: 'hold' }
  );

  res.json({ message: 'Dispute created & escrow hold', dispute });
};

exports.resolveDispute = async (req, res) => {
  const { id } = req.params;
  const { decision } = req.body;

  const dispute = await Dispute.findByIdAndUpdate(
    id,
    { status: 'resolved' },
    { new: true }
  );

  const escrow = await Escrow.findOne({ orderId: dispute.orderId });

  if (decision === 'release') {
    escrow.status = 'released';
  } else {
    escrow.status = 'refunded';
  }

  await escrow.save();

  res.json({ message: 'Resolved' });
};

exports.getAllDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.find();
    res.status(200).json(disputes);
  } catch (error) {
    res.status(500).json({ message: 'Saray disputes nahi mil sakay', error: error.message });
  }
};
