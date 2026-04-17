const express = require('express');
const router = express.Router();
const controller = require('../controllers/DisputeController');

router.post('/create', controller.createDispute);
router.put('/resolve/:id', controller.resolveDispute);

module.exports = router;