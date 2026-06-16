const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { sendMessage, getMessages, getInbox } = require('../controllers/MessageController');

// ✅ /inbox pehle rakho — warna /:orderId match kar leta hai
router.get('/inbox', auth, getInbox);
router.post('/',          auth, sendMessage);
router.get('/:orderId',   auth, getMessages);

module.exports = router;