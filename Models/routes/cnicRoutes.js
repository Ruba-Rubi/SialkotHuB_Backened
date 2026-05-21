const express = require('express');
const router = express.Router();
const cnicController = require('../controllers/cnicController');

// POST route for verification
router.post('/verify', cnicController.verifyCNIC);

module.exports = router;