const User = require('../Users');
const Notification = require('../Notification');

exports.getNotifications = async (req, res) => {
  try {
    const notifs = await Notification.find().sort({ createdAt: -1 });
    res.json(notifs);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const n = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    if (!n) return res.status(404).json({ message: 'Not found' });
    res.json(n);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password');
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getPendingVerifications = async (req, res) => {
  try {
    const users = await User.find({ verificationStatus: 'PENDING', role: { $ne: 'admin' } }).select('-password');
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Shared action handler
const userAction = (action) => async (req, res) => {
  try {
    let update;
    if (action === 'approve') update = { verificationStatus: 'VERIFIED', accountStatus: 'active', rejectionReason: '' };
    else if (action === 'reject') update = { verificationStatus: 'MANUAL', rejectionReason: req.body.reason || 'Documents insufficient' };
    else if (action === 'unblock') update = { accountStatus: 'active' };
    else update = { accountStatus: action }; // block | suspend

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    await Notification.create({
      title: `User ${action.charAt(0).toUpperCase() + action.slice(1)}d`,
      message: `${user.name} (${user.role}) ko admin ne ${action} kar diya.`,
      type: 'system', userId: user._id,
    }).catch(() => {});

    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.approveUser = userAction('approve');
exports.rejectUser  = userAction('reject');
exports.blockUser   = userAction('block');
exports.suspendUser = userAction('suspend');
exports.unblockUser = userAction('unblock');
