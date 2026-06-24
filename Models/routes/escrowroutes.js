const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const {
  createEscrow, stripeInitiate, verifyStripeSession, stripeWebhook, safepayReturn,
  releaseAdvance, clientApproval, releaseRemaining, markDelivered,
  raiseDispute, getEscrowByOrder, markPaidForTesting,
} = require("../controllers/Escrowcontroller");

// Stripe webhook — raw body required for signature verification
router.post("/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// Safepay redirect after payment
router.get("/safepay/return", safepayReturn);

// Protected
router.post("/create",               auth, createEscrow);
router.post("/stripe/initiate/:id",  auth, stripeInitiate);
router.get("/verify/:sessionId",     auth, verifyStripeSession);
router.post("/test-mark-paid/:id",   auth, markPaidForTesting);
router.get("/order/:orderId",        auth, getEscrowByOrder);
router.put("/release/advance/:id",   auth, releaseAdvance);
router.put("/client-approval/:id",   auth, clientApproval);
router.put("/mark-delivered/:id",    auth, markDelivered);
router.put("/release/remaining/:id", auth, releaseRemaining);
router.put("/dispute/:id",           auth, raiseDispute);

module.exports = router;
