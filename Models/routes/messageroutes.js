const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { sendMessage, getMessages } = require('../controllers/MessageController');

// All routes require JWT auth
router.post('/', auth, sendMessage);
router.get('/:orderId', auth, getMessages);

module.exports = router;
