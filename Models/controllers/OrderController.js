const Order  = require('../Orders');
const Review = require('../Reviews');

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
    res.json(order);
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
// Returns: accepted orders + reviews received + orders pending review from manufacturer
exports.getLabourDashboard = async (req, res) => {
  try {
    const lId = req.user.id;

    // Orders this labour is working on
    const orders = await Order.find({ labourId: lId })
      .populate('clientId', 'name companyName')
      .sort({ createdAt: -1 });

    // Reviews received by this labour
    const reviews = await Review.find({ reviewee: lId })
      .populate('reviewer', 'name role')
      .populate('orderId', 'title')
      .sort({ createdAt: -1 });

    res.json({ orders, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
