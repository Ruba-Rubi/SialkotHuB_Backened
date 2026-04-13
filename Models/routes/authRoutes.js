
const express = require('express');
const router = express.Router(); // Pehle ye line honi chahiye

// Phir controller import karein
const authController = require('../controllers/authController');

// Phir routes define karein
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);

// Sab se aakhir mein export karein
module.exports = router;