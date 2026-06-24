const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../Users');
const Notification = require('../Notification');
const ctrl   = require('../controllers/adminController');

// Regular auth middleware (any logged-in user)
async function authOnly(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Token required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    req.userId = String(decoded.user?.id || decoded.id);
    next();
  } catch { res.status(401).json({ message: 'Invalid token' }); }
}

// Admin-only middleware
async function adminOnly(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Token required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    const userId = decoded.user?.id || decoded.id;
    const user = await User.findById(userId).select('role');
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    req.adminId = userId;
    next();
  } catch { res.status(401).json({ message: 'Invalid token' }); }
}

// ── Manufacturer/Labour: apni notifications ───────────────────────────────────
router.get('/my-notifications', authOnly, async (req, res) => {
  try {
    const notifs = await Notification.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(50);
    res.json(notifs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/my-notifications/:id/read', authOnly, async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isRead: true }, { new: true }
    );
    res.json(n || {});
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Send notification to a user (any logged-in user) ─────────────────────────
router.post('/send-notification', authOnly, async (req, res) => {
  try {
    const { userId, title, message, type } = req.body;
    if (!userId || !title || !message) return res.status(400).json({ message: 'userId, title, message required' });
    const n = await Notification.create({ title, message, type: type || 'system', userId: String(userId) });
    res.json(n);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Admin routes ──────────────────────────────────────────────────────────────
router.use(adminOnly);

router.get('/notifications',          ctrl.getNotifications);
router.put('/notifications/read-all', ctrl.markAllRead);
router.put('/notifications/:id/read', ctrl.markNotificationRead);
router.get('/users',                  ctrl.getAllUsers);
router.get('/pending-verifications',  ctrl.getPendingVerifications);
router.put('/users/:id/approve',      ctrl.approveUser);
router.put('/users/:id/reject',       ctrl.rejectUser);
router.put('/users/:id/block',        ctrl.blockUser);
router.put('/users/:id/suspend',      ctrl.suspendUser);
router.put('/users/:id/unblock',      ctrl.unblockUser);

module.exports = router;
