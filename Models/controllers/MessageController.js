
const Message = require('../messages');
const Dispute = require('../dispute');

function analyzeMessage(msg) {
  const badWords = ["fraud", "scam", "bad", "stupid"];

  let flagged = false;
  badWords.forEach(word => {
    if (msg.toLowerCase().includes(word)) {
      flagged = true;
    }
  });

  return flagged;
}

exports.sendMessage = async (req, res) => {
  const { senderId, receiverId, message, orderId } = req.body;

  const flagged = analyzeMessage(message);

  // message save
  await Message.create({
    senderId,
    receiverId,
    message,
    sentiment: flagged ? "negative" : "positive",
    flagged
  });

  if (flagged) {
    // 🔥 Dispute tracking
    let dispute = await Dispute.findOne({ orderId });

    if (!dispute) {
      dispute = await Dispute.create({
        orderId,
        reason: "AI detected abuse",
        warningCount: 1
      });
    } else {
      dispute.warningCount += 1;

      // 🚨 Admin notify logic
      if (dispute.warningCount >= 3) {
        dispute.adminNotified = true;
      }

      await dispute.save();
    }

    return res.json({
      message: "Warning detected",
      warnings: dispute.warningCount,
      adminAlert: dispute.adminNotified
    });
  }

  res.json({ message: "Message sent" });
};