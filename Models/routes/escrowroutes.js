const express = require("express");
const router = express.Router();

const {
  createEscrow,
  releaseAdvance,
  releaseRemaining,
  raiseDispute,
  jazzcashCallback
} = require("../controllers/Escrowcontroller");

router.post("/create", createEscrow);
router.post("/jazzcash/callback", jazzcashCallback);
router.put("/release/advance/:id", releaseAdvance);
router.put("/release/remaining/:id", releaseRemaining);
router.put("/dispute/:id", raiseDispute);

module.exports = router;
