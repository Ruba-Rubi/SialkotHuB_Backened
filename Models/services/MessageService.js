const axios = require('axios');
const Message = require('../Message');
const User = require('../Users');
const Dispute = require('../dispute');

const BERT_URL = process.env.BERT_SERVICE_URL || 'http://127.0.0.1:5000';
const WARNING_THRESHOLD = parseInt(process.env.CHAT_WARNING_THRESHOLD || '3', 10);

// ─── Contact info detection ────────────────────────────────────────────────────
// Detects: phone numbers, emails, WhatsApp refs, disguised patterns, bypass attempts
const CONTACT_PATTERNS = [
  /(\+92|0092|92)[\s\-]?3\d{2}[\s\-]?\d{7}/,          // Pakistani mobile
  /03\d{2}[\s\-]?\d{7}/,                                 // 03XX format
  /\b\d{4}[\s\-]\d{7}\b/,                               // Generic phone
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,   // Email
];
const CONTACT_KEYWORDS = [
  'whatsapp', 'watsapp', 'w/a', 'wa.me',
  'call me', 'call kar', 'mujhe call',
  'direct payment', 'bahar payment', 'outside platform',
  'personal account', 'bank transfer', 'easypaisa', 'jazzcash',
  'mera number', 'mera no', 'my number',
];

function hasContactInfo(text) {
  const lower = text.toLowerCase();
  if (CONTACT_PATTERNS.some(p => p.test(text))) return true;
  if (CONTACT_KEYWORDS.some(k => lower.includes(k))) return true;
  return false;
}

// ─── BERT AI dispute detection ─────────────────────────────────────────────────
async function checkDisputeAI(text) {
  try {
    const res = await axios.post(`${BERT_URL}/predict-dispute`, { message: text });
    return {
      isDispute: res.data.status === 'DISPUTE',
      confidence: res.data.confidence,
    };
  } catch {
    // BERT down hone pe keyword fallback
    const KEYWORDS = [
      'fraud', 'scam', 'refund', 'cheated', 'liar', 'stolen', 'fake',
      'dhoka', 'dhokha', 'chor', 'thag', 'farzi', 'paise wapis', 'paisay wapis',
      'kaam nahi kiya', 'nahi bheja', 'paise la liya',
    ];
    const isDispute = KEYWORDS.some(w => text.toLowerCase().includes(w));
    return { isDispute, confidence: 'keyword-fallback' };
  }
}

// ─── Core message processing ───────────────────────────────────────────────────
// Called by BOTH REST controller AND Socket.IO — single save, single logic path.
//
// @param {Object} params
//   sender   {string} — User ObjectId
//   receiver {string} — User ObjectId
//   orderId  {string}
//   message  {string}
//
// @returns {Object} { savedMessage, aiStatus, aiConfidence, warning?, lockStatus?, dispute? }

async function processMessage({ sender, receiver, orderId, message }) {
  // 1. Load sender to check lock status (only if valid ObjectId)
  const mongoose = require('mongoose');
  const isValidId = mongoose.Types.ObjectId.isValid(sender);
  const senderUser = isValidId ? await User.findById(sender) : null;

  if (senderUser?.isChatLocked) {
    throw Object.assign(
      new Error('Chat locked due to violations. Contact Admin.'),
      { statusCode: 403, locked: true }
    );
  }

  // 2. Contact info filter
  if (hasContactInfo(message)) {
    if (!isValidId) {
      throw Object.assign(new Error('Contact sharing not allowed.'), { statusCode: 400, isWarning: true, warningCount: 1 });
    }
    const updated = await User.findByIdAndUpdate(
      sender,
      { $inc: { warningCount: 1 } },
      { new: true }
    );

    if (updated.warningCount >= WARNING_THRESHOLD) {
      await User.findByIdAndUpdate(sender, { isChatLocked: true });
      throw Object.assign(
        new Error('Chat locked: Too many contact-sharing violations. Account under admin review.'),
        { statusCode: 403, locked: true, warningCount: updated.warningCount }
      );
    }

    throw Object.assign(
      new Error(`Warning ${updated.warningCount}/${WARNING_THRESHOLD}: Sharing contact info is not allowed on platform.`),
      { statusCode: 400, isWarning: true, warningCount: updated.warningCount }
    );
  }

  // 3. BERT dispute detection
  const { isDispute, confidence } = await checkDisputeAI(message);

  // 4. Save message ONCE
  const savedMessage = await Message.create({
    sender,
    receiver,
    orderId,
    message,
    sentiment: isDispute ? 'negative' : 'positive',
    flagged: isDispute,
  });

  // 5. Auto dispute upsert if flagged
  let disputeResult = null;
  if (isDispute) {
    let dispute = await Dispute.findOne({ orderId });
    if (!dispute) {
      dispute = await Dispute.create({
        orderId,
        reason: `AI detected dispute: "${message.substring(0, 100)}"`,
        raisedBy: sender,
        warningCount: 1,
        aiStatus: 'DISPUTE',
        aiConfidence: confidence,
        adminNotified: false,
      });
    } else {
      dispute.warningCount += 1;
      dispute.aiStatus = 'DISPUTE';
      dispute.aiConfidence = confidence;
      if (dispute.warningCount >= WARNING_THRESHOLD) dispute.adminNotified = true;
      await dispute.save();
    }
    disputeResult = {
      warningCount: dispute.warningCount,
      adminNotified: dispute.adminNotified,
    };
  }

  return {
    savedMessage,
    aiStatus: isDispute ? 'DISPUTE' : 'NORMAL',
    aiConfidence: confidence,
    dispute: disputeResult,
  };
}

module.exports = { processMessage, hasContactInfo, checkDisputeAI };
