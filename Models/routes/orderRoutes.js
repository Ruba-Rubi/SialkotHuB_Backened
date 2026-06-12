const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  createOrder, getClientOrders,
  getManufacturerOrders, acceptOrder,
  createLabourOrder, getLabourOrders, acceptLabourOrder,
  getManufacturerDashboard, getLabourDashboard,
} = require('../controllers/OrderController');

router.post('/',                        auth, createOrder);
router.get('/client',                   auth, getClientOrders);
router.get('/manufacturer',             auth, getManufacturerOrders);
router.get('/manufacturer/dashboard',   auth, getManufacturerDashboard);
router.put('/accept/:id',               auth, acceptOrder);
router.post('/labour',                  auth, createLabourOrder);
router.get('/labour',                   auth, getLabourOrders);
router.get('/labour/dashboard',         auth, getLabourDashboard);
router.put('/labour/accept/:id',        auth, acceptLabourOrder);

module.exports = router;
