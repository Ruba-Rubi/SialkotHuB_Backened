const express = require("express");
const router = express.Router();

const {
  createEscrow,
  releasePayment,
  raiseDispute,
  markAsPaid
} = require("../controllers/Escrowcontroller");
//debug
console.log(createEscrow, releasePayment, raiseDispute, markAsPaid);
//routes
router.post("/create", createEscrow);
router.put("/pay/:id", markAsPaid);
router.put("/release/:id", releasePayment);
router.put("/dispute/:id", raiseDispute);

module.exports = router;
