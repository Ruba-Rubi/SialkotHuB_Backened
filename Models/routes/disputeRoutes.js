const express = require('express');
const router = express.Router();
const controller = require('../controllers/DisputeController');

router.post('/create', controller.createDispute);
router.put('/resolve/:id', controller.resolveDispute);
// --- Yahan ye line add karein ---
router.get('/', controller.getAllDisputes);
module.exports = router;