const express = require("express");
const router = express.Router();

const {
  createEscrow,
  releaseAdvance,
  clientApproval,
  releaseRemaining,
  raiseDispute,
  jazzcashPayment,
  jazzcashCallback
} = require("../controllers/Escrowcontroller");

router.post("/create", createEscrow);
router.post("/jazzcash/callback", jazzcashCallback);
router.put("/release/advance/:id", releaseAdvance);
router.put("/approve/:id", clientApproval);        // ✅ NEW: Client final approval
router.put("/release/remaining/:id", releaseRemaining);
router.put("/dispute/:id", raiseDispute);

module.exports = router;