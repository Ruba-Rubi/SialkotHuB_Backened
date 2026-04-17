const express = require('express');
const router = express.Router();
const controller = require('../controllers/MessageController'); 

router.post('/send', controller.sendMessage);

module.exports = router;