const express = require('express');
const router = express.Router();
const Message = require('../Message');
const User = require('../Users');
const Dispute = require('../dispute');
const axios = require('axios');

// --- BERT AI CHECK ---
async function checkDisputeFromAI(text) {
  try {
    const res = await axios.post('http://127.0.0.1:5000/predict-dispute', { message: text });
    return { isDispute: res.data.status === 'DISPUTE', confidence: res.data.confidence };
  } catch {
    // Fallback: keyword check
    const bad = ["fraud", "scam", "dhoka", "fake", "refund", "not delivered"];
    return { isDispute: bad.some(w => text.toLowerCase().includes(w)), confidence: 'N/A' };
  }
}

// --- CONTACT INFO FILTER ---
const hasContactInfo = (text) =>
  /(\+92|03\d{9}|[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi.test(text) ||
  ["whatsapp", "call me", "direct payment"].some(w => text.toLowerCase().includes(w));

// --- GET MESSAGES ---
router.get('/:orderId', async (req, res) => {
  try {
    const messages = await Message.find({ orderId: req.params.orderId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- POST MESSAGE ---
router.post('/', async (req, res) => {
  try {
    const { sender, receiver, orderId, message } = req.body;

    // 1. Chat lock check
    const user = await User.findById(sender);
    if (user?.isChatLocked) {
      return res.status(403).json({ error: "Chat locked due to violations. Contact Admin." });
    }

    // 2. Contact info filter
    if (hasContactInfo(message)) {
      const updated = await User.findByIdAndUpdate(sender, { $inc: { warningCount: 1 } }, { new: true });
      if (updated.warningCount >= 3) {
        await User.findByIdAndUpdate(sender, { isChatLocked: true });
        return res.status(400).json({ ai_warning: "Chat Locked: Account under admin review." });
      }
      return res.status(400).json({ ai_warning: `Warning ${updated.warningCount}: Contact info sharing not allowed.` });
    }

    // 3. BERT dispute detection
    const { isDispute, confidence } = await checkDisputeFromAI(message);

    // 4. Save message
    const newMessage = await Message.create({
      sender, receiver, orderId, message,
      sentiment: isDispute ? 'negative' : 'positive',
      flagged: isDispute,
      isFlagged: isDispute
    });

    // 5. Auto-create/update dispute if flagged
    if (isDispute) {
      let dispute = await Dispute.findOne({ orderId });
      if (!dispute) {
        dispute = await Dispute.create({
          orderId,
          reason: `AI detected dispute in chat: "${message.substring(0, 100)}"`,
          raisedBy: sender,
          warningCount: 1,
          aiStatus: 'DISPUTE',
          aiConfidence: confidence
        });
      } else {
        dispute.warningCount += 1;
        dispute.aiStatus = 'DISPUTE';
        dispute.aiConfidence = confidence;
        if (dispute.warningCount >= 3) dispute.adminNotified = true;
        await dispute.save();
      }

      return res.json({
        message: newMessage,
        aiWarning: "Dispute detected by Skillora AI",
        aiStatus: 'DISPUTE',
        aiConfidence: confidence,
        warnings: dispute.warningCount,
        adminAlert: dispute.adminNotified
      });
    }

    res.json({ message: newMessage, aiStatus: 'NORMAL' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
