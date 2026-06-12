const express = require('express');
const router  = express.Router();
const rc      = require('../controllers/reviewController');
const auth    = require('../middleware/auth');

router.post('/add',              auth, rc.addReview);         // general review (no order)
router.post('/order',            auth, rc.addOrderReview);    // order-linked review
router.get('/order/:orderId',    auth, rc.getReviewByOrder);  // get my review for an order
router.get('/:userId',           auth, rc.getReviews);        // all reviews for a user

module.exports = router;
