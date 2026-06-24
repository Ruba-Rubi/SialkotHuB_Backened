const Order  = require('../Orders');
const Review = require('../Reviews');
const Notification = require('../Notification');

// ─── Client creates order ─────────────────────────────────────────────────────
exports.createOrder = async (req, res) => {
  try {
    const { title, description, category, quantity, budget, deadline, specifications } = req.body;
    const order = await Order.create({
      title, description, category, quantity, budget, deadline, specifications,
      clientId: req.user.id,
    });
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Client fetches their orders ──────────────────────────────────────────────
exports.getClientOrders = async (req, res) => {
  try {
    const orders = await Order.find({ clientId: req.user.id })
      .populate('manufacturerId', 'name companyName')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Manufacturer: available + accepted orders ────────────────────────────────
exports.getManufacturerOrders = async (req, res) => {
  try {
    const available = await Order.find({ status: 'pending', targetRole: { $ne: 'Labour' }, manufacturerId: null })
      .populate('clientId', 'name')
      .sort({ createdAt: -1 });
    const accepted = await Order.find({ manufacturerId: req.user.id })
      .populate('clientId', 'name')
      .sort({ createdAt: -1 });
    res.json({ available, accepted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Manufacturer accepts order ───────────────────────────────────────────────
exports.acceptOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'pending') return res.status(400).json({ message: 'Order already taken' });
    order.manufacturerId = req.user.id;
    order.status = 'in-progress';
    await order.save();
    if (order.clientId) {
      await Notification.create({ title: 'Order Accepted', message: `Aapka "${order.title}" order ek manufacturer na accept ker liya. Approve ya reject karein.`, type: 'order_accepted', userId: String(order.clientId), orderId: String(order._id) }).catch(() => {});
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Client cancels/rejects order ────────────────────────────────────────────
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.manufacturerId = null;
    order.status = 'pending';
    await order.save();
    res.json({ message: 'Order cancelled', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Manufacturer posts a labour order ───────────────────────────────────────
exports.createLabourOrder = async (req, res) => {
  try {
    const { title, description, category, quantity, budget, deadline, specifications } = req.body;
    const order = await Order.create({
      title, description, category, quantity, budget, deadline, specifications,
      clientId: req.user.id,
      targetRole: 'Labour',
    });
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Labour: available + accepted orders ─────────────────────────────────────
exports.getLabourOrders = async (req, res) => {
  try {
    const available = await Order.find({ status: 'pending', targetRole: 'Labour', labourId: null })
      .populate('clientId', 'name companyName')
      .sort({ createdAt: -1 });
    const accepted = await Order.find({ labourId: req.user.id })
      .populate('clientId', 'name companyName')
      .sort({ createdAt: -1 });
    res.json({ available, accepted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Labour accepts a labour order ───────────────────────────────────────────
exports.acceptLabourOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.targetRole !== 'Labour') return res.status(400).json({ message: 'Not a labour order' });
    if (order.status !== 'pending') return res.status(400).json({ message: 'Order already taken' });
    order.labourId = req.user.id;
    order.status = 'in-progress';
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── MANUFACTURER DASHBOARD ───────────────────────────────────────────────────
// Returns: accepted client orders + labour orders posted by manufacturer + reviews received
exports.getManufacturerDashboard = async (req, res) => {
  try {
    const mId = req.user.id;

    // Client orders this manufacturer is handling
    const clientOrders = await Order.find({ manufacturerId: mId })
      .populate('clientId', 'name')
      .sort({ createdAt: -1 });

    // Labour orders posted by this manufacturer
    const labourOrders = await Order.find({ clientId: mId, targetRole: 'Labour' })
      .populate('labourId', 'name')
      .sort({ createdAt: -1 });

    // Reviews received (as reviewee)
    const reviews = await Review.find({ reviewee: mId })
      .populate('reviewer', 'name role')
      .populate('orderId', 'title')
      .sort({ createdAt: -1 });

    // Which orders still need a review from this manufacturer (completed labour orders without review)
    const completedLabourOrderIds = labourOrders
      .filter(o => ['completed', 'in-progress'].includes(o.status) && o.labourId)
      .map(o => String(o._id));

    const givenReviewOrderIds = (await Review.find({ reviewer: mId }).select('orderId'))
      .map(r => String(r.orderId));

    const pendingReviewOrders = labourOrders.filter(
      o => completedLabourOrderIds.includes(String(o._id)) &&
           !givenReviewOrderIds.includes(String(o._id))
    );

    res.json({
      clientOrders,
      labourOrders,
      reviews,
      pendingReviewOrders, // manufacturer hasn't reviewed the labour yet on these
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── LABOUR DASHBOARD ─────────────────────────────────────────────────────────
exports.getLabourDashboard = async (req, res) => {
  try {
    const lId = req.user.id;
    const orders = await Order.find({ labourId: lId })
      .populate('clientId', 'name companyName')
      .sort({ createdAt: -1 });
    const reviews = await Review.find({ reviewee: lId })
      .populate('reviewer', 'name role')
      .populate('orderId', 'title')
      .sort({ createdAt: -1 });
    res.json({ orders, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Manufacturer: get their own labour orders ────────────────────────────────
exports.getManufacturerLabourOrders = async (req, res) => {
  try {
    const orders = await Order.find({ clientId: req.user.id, targetRole: 'Labour' })
      .populate('labourId', 'name')
      .populate('applicants.labourId', 'name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Labour applies for a labour order ───────────────────────────────────────
exports.applyLabourOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.targetRole !== 'Labour') return res.status(400).json({ message: 'Not a labour order' });
    const alreadyApplied = order.applicants?.some(a => String(a.labourId) === String(req.user.id));
    if (alreadyApplied) return res.status(400).json({ message: 'Already applied' });
    order.applicants = order.applicants || [];
    order.applicants.push({ labourId: req.user.id });
    await order.save();
    res.json({ message: 'Applied successfully', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Manufacturer hires a labour ──────────────────────────────────────────────
exports.hireLabour = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const { labourId } = req.body;
    order.labourId = labourId;
    order.status = 'in-progress';
    if (order.applicants) {
      order.applicants = order.applicants.map(a =>
        String(a.labourId) === String(labourId) ? { ...a.toObject(), status: 'hired' } : { ...a.toObject(), status: 'rejected' }
      );
    }
    await order.save();
    await Notification.create({ title: 'Hired!', message: `Aapko "${order.title}" order ke liye hire kar liya gaya.`, type: 'hire', userId: String(labourId) }).catch(() => {});
    res.json({ message: 'Labour hired', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Manufacturer rejects a labour applicant ─────────────────────────────────
exports.rejectLabour = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const { labourId } = req.body;
    if (order.applicants) {
      order.applicants = order.applicants.map(a =>
        String(a.labourId) === String(labourId) ? { ...a.toObject(), status: 'rejected' } : a.toObject()
      );
    }
    await order.save();
    await Notification.create({ title: 'Application Update', message: `Afsos, "${order.title}" order ke liye aapki application reject ho gayi.`, type: 'reject', userId: String(labourId) }).catch(() => {});
    res.json({ message: 'Labour rejected', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Complete a labour order ──────────────────────────────────────────────────
exports.completeLabourOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.status = 'completed';
    await order.save();
    if (order.labourId) {
      await Notification.create({ title: 'Order Completed', message: `"${order.title}" order complete ho gaya.`, type: 'complete', userId: String(order.labourId) }).catch(() => {});
    }
    if (order.clientId) {
      await Notification.create({ title: 'Order Completed', message: `Manufacturer na "${order.title}" order complete ker diya.`, type: 'complete', userId: String(order.clientId) }).catch(() => {});
    }
    res.json({ message: 'Order completed', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Labour marks their work as done ─────────────────────────────────────────
exports.labourMarkComplete = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (String(order.labourId) !== String(req.user.id)) return res.status(403).json({ message: 'Not authorized' });
    order.status = 'completed';
    await order.save();
    // Notify manufacturer (clientId of labour order = manufacturer)
    if (order.clientId) {
      await Notification.create({
        title: 'Labour Kaam Complete',
        message: `Labour na "${order.title}" ka kaam complete ker diya. Please review karein.`,
        type: 'labour_complete',
        userId: String(order.clientId),
        orderId: String(order._id)
      }).catch(() => {});
    }
    res.json({ message: 'Kaam complete mark ho gaya', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
