const mongoose = require("mongoose");
const Escrow = require("../escrow");
const User   = require("../Users");
const Order  = require("../Orders"); // ✅ FIX: Direct import instead of mongoose.model()

// ─── CREATE ESCROW ────────────────────────────────────────────────────────────
const createEscrow = async (req, res) => {
  try {
    const { orderId, clientId, manufacturerId, totalAmount } = req.body;

    const existing = await Escrow.findOne({ orderId });
    if (existing) {
      return res.status(400).json({ message: "Escrow already exists for this order" });
    }

    const advance   = Math.round(totalAmount * 0.3);
    const remaining = Math.round(totalAmount * 0.7);

    const escrow = await Escrow.create({
      orderId,
      clientId,
      manufacturerId,
      totalAmount,
      advanceAmount:   advance,
      remainingAmount: remaining,
      status:          "pending",
    });

    res.status(201).json({ message: "Escrow created", escrow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── STRIPE: CREATE CHECKOUT SESSION ─────────────────────────────────────────
const stripeInitiate = async (req, res) => {
  try {
    let escrow = await Escrow.findOne({ orderId: req.params.id });

    if (!escrow) {
      const { amount, title } = req.body;
      if (!amount) return res.status(400).json({ message: "Amount zaroori hai" });

      // ✅ FIX: Proper Order import se manufacturerId fetch karo
      let manufacturerId = null;
      try {
        const order = await Order.findById(req.params.id).select("manufacturerId");
        if (order && order.manufacturerId) manufacturerId = order.manufacturerId;
        console.log("✅ manufacturerId from order:", manufacturerId);
      } catch (e) {
        console.log("Order fetch error:", e.message);
      }

      escrow = await Escrow.create({
        orderId:         req.params.id,
        clientId:        req.user._id || req.user.id,
        manufacturerId,  // ✅ Ab null nahi hoga
        totalAmount:     amount,
        advanceAmount:   Math.round(amount * 0.3),
        remainingAmount: Math.round(amount * 0.7),
        status:          "pending",
      });
    }

    // ✅ FIX: Agar escrow already hai aur manufacturerId null hai toh update karo
    if (!escrow.manufacturerId) {
      try {
        const order = await Order.findById(req.params.id).select("manufacturerId");
        if (order && order.manufacturerId) {
          escrow.manufacturerId = order.manufacturerId;
          await escrow.save();
          console.log("✅ Updated existing escrow manufacturerId:", order.manufacturerId);
        }
      } catch (e) {
        console.log("Could not update manufacturerId:", e.message);
      }
    }

    if (!["pending", "awaiting_payment"].includes(escrow.status)) {
      return res.status(400).json({ message: `Already processed. Status: ${escrow.status}` });
    }

    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "pkr",
          product_data: { name: req.body.title || "Skillora Order Payment" },
          unit_amount: Math.round(escrow.totalAmount * 100),
        },
        quantity: 1,
      }],
      success_url: `http://localhost:3000/payment/success?session_id={CHECKOUT_SESSION_ID}&escrowId=${escrow._id}`,
      cancel_url:  `http://localhost:3000/payment/cancel`,
    });

    escrow.stripeSessionId = session.id;
    escrow.status = "awaiting_payment";
    await escrow.save();

    res.json({ checkoutUrl: session.url, escrowId: escrow._id });
  } catch (error) {
    console.error("Stripe initiate error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// ─── STRIPE: VERIFY SESSION ───────────────────────────────────────────────────
const verifyStripeSession = async (req, res) => {
  try {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);

    const escrow = await Escrow.findOne({ stripeSessionId: req.params.sessionId });

    if (escrow && session.payment_status === "paid" && escrow.status === "awaiting_payment") {
      escrow.status = "paid";
      await escrow.save();
    }

    res.json({ status: session.payment_status, escrow: escrow || null });
  } catch (error) {
    console.error("Verify session error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// ─── STRIPE WEBHOOK ───────────────────────────────────────────────────────────
const stripeWebhook = async (req, res) => {
  try {
    const sig    = req.headers["stripe-signature"];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

    let event;
    if (secret) {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } else {
      event = req.body;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const escrow  = await Escrow.findOne({ stripeSessionId: session.id });
      if (escrow && escrow.status === "awaiting_payment") {
        escrow.status = "paid";
        await escrow.save();
        console.log(`✅ Stripe payment confirmed: ${escrow._id}`);
      }
    }
    res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

// ─── 30% ADVANCE RELEASE ─────────────────────────────────────────────────────
const releaseAdvance = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id);
    if (!escrow)                return res.status(404).json({ message: "Escrow not found" });
    if (escrow.advanceReleased) return res.status(400).json({ message: "Advance already released" });
    if (escrow.status !== "paid")
      return res.status(400).json({ message: `Payment not confirmed yet. Status: ${escrow.status}` });

    // ✅ FIX: Agar manufacturerId null hai toh Order se fetch karo
    if (!escrow.manufacturerId) {
      try {
        const order = await Order.findById(escrow.orderId).select("manufacturerId");
        if (order && order.manufacturerId) {
          escrow.manufacturerId = order.manufacturerId;
          await escrow.save();
          console.log("✅ Fixed missing manufacturerId from order");
        }
      } catch (e) {
        console.log("Could not fix manufacturerId:", e.message);
      }
    }

    const manufacturer = await User.findById(escrow.manufacturerId);
    if (!manufacturer) return res.status(404).json({ message: "Manufacturer not found" });

    if (!manufacturer.wallet) manufacturer.wallet = { balance: 0 };
    manufacturer.wallet.balance += escrow.advanceAmount;
    await manufacturer.save();

    escrow.advanceReleased = true;
    escrow.status          = "advance_released";
    await escrow.save();

    res.json({
      message:             `✅ 30% advance (Rs ${escrow.advanceAmount}) released to manufacturer`,
      manufacturerBalance: manufacturer.wallet.balance,
      escrow,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── MANUFACTURER MARKS WORK COMPLETE ────────────────────────────────────────
const markDelivered = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id);
    if (!escrow) return res.status(404).json({ message: "Escrow not found" });
    if (escrow.delivered) return res.status(400).json({ message: "Already marked as delivered" });
    if (!escrow.advanceReleased) return res.status(400).json({ message: "Advance not released yet" });

    escrow.delivered = true;
    await escrow.save();

    const Notification = require('../Notification');
    const order = await Order.findById(escrow.orderId).select('title clientId').lean();
    if (order?.clientId) {
      await Notification.create({
        title: 'Kaam Complete',
        message: `Manufacturer na "${order.title}" ka kaam complete ker diya. Please review karein aur payment release karein.`,
        type: 'order_completed',
        userId: String(order.clientId),
        orderId: String(escrow.orderId)
      }).catch(() => {});
    }

    res.json({ message: "✅ Delivered marked. Client ko notification bhej di.", escrow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const clientApproval = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id);
    if (!escrow)                       return res.status(404).json({ message: "Escrow not found" });
    if (escrow.status === "disputed")  return res.status(400).json({ message: "Dispute is active" });
    if (escrow.status === "released")  return res.status(400).json({ message: "Order already completed" });
    if (!escrow.advanceReleased)       return res.status(400).json({ message: "Order not started yet" });
    if (escrow.clientApproved)         return res.status(400).json({ message: "Already approved" });

    escrow.clientApproved = true;
    escrow.status         = "approved";
    await escrow.save();

    if (escrow.manufacturerId) {
      const Notification = require('../Notification');
      const order = await Order.findById(escrow.orderId).select('title').lean();
      await Notification.create({ title: 'Delivery Approved', message: `Client na "${order?.title || 'Order'}" ki delivery approve ker di. Ab 70% payment release hogi.`, type: 'system', userId: String(escrow.manufacturerId), orderId: String(escrow.orderId) }).catch(() => {});
    }

    res.json({ message: "✅ Delivery approved by client. Release 70% now.", escrow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── 70% REMAINING RELEASE ───────────────────────────────────────────────────
const releaseRemaining = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id);
    if (!escrow)                   return res.status(404).json({ message: "Escrow not found" });
    if (escrow.remainingReleased)  return res.status(400).json({ message: "70% already released" });
    if (!escrow.clientApproved)    return res.status(400).json({ message: "Client approval required" });
    if (escrow.status === "disputed") return res.status(400).json({ message: "Dispute is active" });
    if (escrow.status !== "approved")
      return res.status(400).json({ message: `Cannot release. Status: ${escrow.status}` });

    // ✅ FIX: Agar manufacturerId null hai toh Order se fetch karo
    if (!escrow.manufacturerId) {
      try {
        const order = await Order.findById(escrow.orderId).select("manufacturerId");
        if (order && order.manufacturerId) {
          escrow.manufacturerId = order.manufacturerId;
          await escrow.save();
        }
      } catch (e) {}
    }

    const manufacturer = await User.findById(escrow.manufacturerId);
    if (!manufacturer) return res.status(404).json({ message: "Manufacturer not found" });

    if (!manufacturer.wallet) manufacturer.wallet = { balance: 0 };
    manufacturer.wallet.balance += escrow.remainingAmount;
    await manufacturer.save();

    escrow.remainingReleased = true;
    escrow.status            = "released";
    await escrow.save();

    const Notification = require('../Notification');
    const order = await Order.findById(escrow.orderId).select('title').lean();
    await Notification.create({ title: 'Payment Released', message: `"${order?.title || 'Order'}" ka 70% payment (Rs ${escrow.remainingAmount}) aapke wallet mein aa gaya. Order complete!`, type: 'system', userId: String(manufacturer._id), orderId: String(escrow.orderId) }).catch(() => {});

    res.json({
      message:             `✅ Order complete! 70% (Rs ${escrow.remainingAmount}) released to manufacturer.`,
      manufacturerBalance: manufacturer.wallet.balance,
      totalPaid:           escrow.totalAmount,
      escrow,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── RAISE DISPUTE ────────────────────────────────────────────────────────────
const raiseDispute = async (req, res) => {
  try {
    const escrow = await Escrow.findOne({ orderId: req.params.id }) || await Escrow.findById(req.params.id);

    if (escrow) {
      if (escrow.status === "released") return res.status(400).json({ message: "Cannot dispute completed order" });
      if (escrow.status === "disputed") return res.status(400).json({ message: "Dispute already active" });
      escrow.status = "disputed";
      await escrow.save();
      return res.json({ message: "⚠️ Dispute raised. Funds are on hold.", escrow });
    }

    // No escrow yet — still allow dispute to be raised
    res.json({ message: "Dispute raised. No escrow found for this order.", escrow: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── TEST ONLY: manually mark escrow as paid ─────────────────────────────────
const markPaidForTesting = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id);
    if (!escrow) return res.status(404).json({ message: "Escrow not found" });
    escrow.status = "paid";
    escrow.jazzcashTxnRef = "TEST-" + Date.now();
    await escrow.save();
    res.json({ message: "✅ Marked as paid (test mode)", escrow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── SAFEPAY RETURN ───────────────────────────────────────────────────────────
const safepayReturn = async (req, res) => {
  const FRONTEND = process.env.FRONTEND_URL || "http://localhost:3000";
  res.redirect(`${FRONTEND}/payment/cancel`);
};

// ─── GET ESCROW BY ORDER ID ───────────────────────────────────────────────────
const getEscrowByOrder = async (req, res) => {
  try {
    const id = req.params.orderId;
    let escrow = await Escrow.findOne({ orderId: id });
    if (!escrow) escrow = await Escrow.findById(id).catch(() => null);
    if (!escrow) return res.status(404).json({ message: "Escrow not found" });
    res.json(escrow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── EXPORTS ──────────────────────────────────────────────────────────────────
module.exports = {
  createEscrow, stripeInitiate, verifyStripeSession, stripeWebhook, safepayReturn,
  releaseAdvance, clientApproval, releaseRemaining, markDelivered,
  raiseDispute, getEscrowByOrder, markPaidForTesting,
};