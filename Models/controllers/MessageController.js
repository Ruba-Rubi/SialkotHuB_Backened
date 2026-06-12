const Message = require('../Message');
const Order   = require('../Orders');
const { processMessage } = require('../services/MessageService');

// POST /api/messages
exports.sendMessage = async (req, res) => {
  try {
    const { receiver, orderId, message } = req.body;
    const sender = req.user.id;

    // Verify sender belongs to this order (2-sided only)
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const members = [
      String(order.clientId),
      order.manufacturerId ? String(order.manufacturerId) : null,
      order.labourId       ? String(order.labourId)       : null,
    ].filter(Boolean);

    if (!members.includes(sender)) {
      return res.status(403).json({ error: 'Not authorized for this order chat' });
    }

    const result = await processMessage({ sender, receiver, orderId, message });

    return res.status(201).json({
      message: result.savedMessage,
      aiStatus: result.aiStatus,
      aiConfidence: result.aiConfidence,
      ...(result.dispute && {
        aiWarning: 'Dispute detected by Skillora AI',
        warnings: result.dispute.warningCount,
        adminAlert: result.dispute.adminNotified,
      }),
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      error: err.message,
      ...(err.isWarning && { warningCount: err.warningCount }),
      ...(err.locked   && { locked: true }),
    });
  }
};

// GET /api/messages/:orderId
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    // Verify user belongs to this order
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const members = [
      String(order.clientId),
      order.manufacturerId ? String(order.manufacturerId) : null,
      order.labourId       ? String(order.labourId)       : null,
    ].filter(Boolean);

    if (!members.includes(userId)) {
      return res.status(403).json({ error: 'Not authorized for this order chat' });
    }

    const messages = await Message.find({ orderId }).sort({ createdAt: 1 });

    return res.json(messages);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
