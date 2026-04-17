const express = require('express');
const router = express.Router();
const Message = require('../Message');
const User = require('../Users'); // User model lazmi import karein

// --- AI FILTER FUNCTION ---
const checkIllegalActivity = (text) => {
    // 1. Phone numbers aur Emails (Anti-WhatsApp/Direct Contact)
    const contactPattern = /(\+92|03\d{9}|[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi;
    
    // 2. Harmful/Ghalat alfaaz
    const restrictedKeywords = ["whatsapp", "call me", "direct payment", "number", "gali1", "gali2"];

    const hasContactInfo = contactPattern.test(text);
    const hasBadWords = restrictedKeywords.some(word => text.toLowerCase().includes(word));

    return hasContactInfo || hasBadWords;
};

// --- POST MESSAGE (With AI Monitoring) ---
router.post('/', async (req, res) => {
    try {
        const { sender, receiver, orderId, message } = req.body;

        // 1. Check if User's Chat is already locked
        const user = await User.findOne({ _id: sender });
        if (user && user.isChatLocked) {
            return res.status(403).json({ 
                error: "Your chat is locked due to multiple violations. Contact Admin." 
            });
        }

        // 2. Run AI Filter
        const isHarmful = checkIllegalActivity(message);

        if (isHarmful) {
            // Warning Count barhao
            const updatedUser = await User.findOneAndUpdate(
                { _id: sender },
                { $inc: { warningCount: 1 } },
                { new: true }
            );

            let alertMessage = "";
            if (updatedUser.warningCount === 1) {
                alertMessage = "Warning 1: Please keep communication on Sialkot Trade Trust. Sharing contact info is not allowed.";
            } else if (updatedUser.warningCount === 2) {
                alertMessage = "Warning 2: Final Warning! Next violation will lock your chat.";
            } else {
                // 3rd Violation: Lock the chat
                await User.findOneAndUpdate({ _id: sender }, { isChatLocked: true });
                alertMessage = "Chat Locked: Your account is under review by Admin for policy violations.";
            }

            return res.status(400).json({ ai_warning: alertMessage });
        }

        // 3. Agar message theek hai toh save karein
        const newMessage = new Message({ sender, receiver, orderId, message, isFlagged: false });
        await newMessage.save();
        res.json(newMessage);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;