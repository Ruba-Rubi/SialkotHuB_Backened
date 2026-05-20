const Message = require('../messages');
const Dispute = require('../dispute');

// 🚀 Python AI Engine (Flask) se baat karne wala function
async function checkDisputeFromAI(msg) {
  try {
    const response = await fetch('http://127.0.0.1:5000/predict-dispute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: msg })
    });

    const data = await response.json();
    // Agar Python server "DISPUTE" return karega toh ye true ho jayega
    return data.status === "DISPUTE";
  } catch (error) {
    console.error("⚠️ AI Server se connect nahi ho paya:", error.message);
    
    // BACKUP LOGIC: Agar presentation ke waqt Python server band ho, toh code crash na ho balkay purane tareeqay par chal pare
    const badWords = ["fraud", "scam", "bad", "stupid", "dhoka", "fake"];
    return badWords.some(word => msg.toLowerCase().includes(word));
  }
}

exports.sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, message, orderId } = req.body;

    // 🔥 Ab check hardcoded bad words se nahi, seedha Python AI Server se hoga!
    const flagged = await checkDisputeFromAI(message);

    // 1. Message MongoDB database mein save karein
    await Message.create({
      senderId,
      receiverId,
      message,
      sentiment: flagged ? "negative" : "positive",
      flagged
    });

    // 2. Agar AI ne dispute/abuse detect kiya hai:
    if (flagged) {
      let dispute = await Dispute.findOne({ orderId });

      if (!dispute) {
        dispute = await Dispute.create({
          orderId,
          reason: "AI detected abuse/dispute",
          warningCount: 1
        });
      } else {
        dispute.warningCount += 1;

        // 🚨 Admin notify logic (Agar 3 ya us se zyada warnings hon)
        if (dispute.warningCount >= 3) {
          dispute.adminNotified = true;
        }

        await dispute.save();
      }

      return res.json({
        message: "Warning detected by Skillora AI Engine",
        warnings: dispute.warningCount,
        adminAlert: dispute.adminNotified,
        status: "DISPUTE"
      });
    }

    // 3. Agar sab normal hai:
    res.json({ message: "Message sent", status: "NORMAL" });

  } catch (error) {
    console.error("Controller Error:", error);
    res.status(500).json({ error: "Server mein koi masla aaya hai." });
  }
};