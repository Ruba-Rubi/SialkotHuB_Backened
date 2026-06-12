const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); 

// Routes define karein
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.get('/users', authController.getUsers);

module.exports = router;