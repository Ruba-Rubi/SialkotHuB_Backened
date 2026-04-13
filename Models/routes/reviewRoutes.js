const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

// 1. Apna auth middleware import karein
const auth = require('../middleware/auth'); 

// 2. Route mein 'auth' ko add karein
// Ab 'addReview' tabhi chalega jab valid token header mein maujood hoga
router.post('/add', auth, reviewController.addReview);

module.exports = router;