const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  createOrder, getClientOrders,
  getManufacturerOrders, acceptOrder, cancelOrder,
  createLabourOrder, getLabourOrders, acceptLabourOrder,
  getManufacturerDashboard, getLabourDashboard,
  getManufacturerLabourOrders, applyLabourOrder,
  hireLabour, rejectLabour, completeLabourOrder, labourMarkComplete,
} = require('../controllers/OrderController');

router.post('/',                        auth, createOrder);
router.get('/client',                   auth, getClientOrders);
router.get('/manufacturer',             auth, getManufacturerOrders);
router.get('/manufacturer/dashboard',   auth, getManufacturerDashboard);
router.put('/accept/:id',               auth, acceptOrder);
router.put('/cancel/:id',               auth, cancelOrder);
router.post('/labour',                  auth, createLabourOrder);
router.get('/labour',                   auth, getLabourOrders);
router.get('/labour/dashboard',         auth, getLabourDashboard);
router.put('/labour/accept/:id',        auth, acceptLabourOrder);
router.get('/labour/mine',              auth, getManufacturerLabourOrders);
router.post('/labour/apply/:id',        auth, applyLabourOrder);
router.put('/labour/hire/:id',          auth, hireLabour);
router.put('/labour/reject/:id',        auth, rejectLabour);
router.post('/labour/complete/:id',     auth, completeLabourOrder);
router.put('/labour/mark-complete/:id', auth, labourMarkComplete);

module.exports = router;
