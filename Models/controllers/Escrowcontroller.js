const Escrow = require("../escrow");
const User = require("../Users");

// Create Escrow
const createEscrow = async (req, res) => {
  try {
    const { orderId, clientId, manufacturerId, totalAmount } = req.body;

    const advance = totalAmount * 0.3;
    const remaining = totalAmount * 0.7;

    const escrow = new Escrow({
      orderId,
      clientId,
      manufacturerId,
      totalAmount,
      advanceAmount: advance,
      remainingAmount: remaining,
      advanceReleased: false,
      remainingReleased: false,
      clientApproved: false,
      status: "pending"
    });

    await escrow.save();

    res.status(201).json({
      message: "Escrow created successfully",
      escrow
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// JazzCash Callback
const jazzcashCallback = async (req, res) => {
  try {
    const { orderId } = req.body;

    const escrow = await Escrow.findOne({ orderId });

    if (!escrow) {
      return res.status(404).json({ message: "Escrow not found" });
    }

    escrow.status = "paid";
    await escrow.save();

    res.json({
      message: "Payment received",
      escrow
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// 30% Release — Manufacturer kaam shuru kare
const releaseAdvance = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id);

    if (!escrow) {
      return res.status(404).json({ message: "Escrow not found" });
    }

    if (escrow.advanceReleased) {
      return res.status(400).json({ message: "Advance already released" });
    }

    if (escrow.status !== "paid") {
      return res.status(400).json({ message: "Payment not confirmed yet" });
    }

    const manufacturer = await User.findById(escrow.manufacturerId);

    if (!manufacturer) {
      return res.status(404).json({ message: "Manufacturer not found" });
    }

    if (!manufacturer.wallet) {
      manufacturer.wallet = { balance: 0 };
    }

    manufacturer.wallet.balance += escrow.advanceAmount;
    await manufacturer.save();

    escrow.advanceReleased = true;
    escrow.status = "paid";
    await escrow.save();

    res.json({
      message: "30% advance released successfully",
      escrow
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ✅ NEW: Client Final Approval — delivery confirm kare
const clientApproval = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id);

    if (!escrow) {
      return res.status(404).json({ message: "Escrow not found" });
    }

    if (escrow.status === "disputed") {
      return res.status(400).json({ message: "Cannot approve a disputed order" });
    }

    if (escrow.status === "released") {
      return res.status(400).json({ message: "Order already completed" });
    }

    if (!escrow.advanceReleased) {
      return res.status(400).json({ message: "Advance not released yet. Order not started." });
    }

    // Client ne delivery approve ki
    escrow.clientApproved = true;
    escrow.status = "approved";
    await escrow.save();

    res.json({
      message: "Client approved delivery. 70% will now be released.",
      escrow
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// 70% Release — sirf tab jab client approve kare
const releaseRemaining = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id);

    if (!escrow) {
      return res.status(404).json({ message: "Escrow not found" });
    }

    if (escrow.remainingReleased) {
      return res.status(400).json({ message: "Already released" });
    }

    // ✅ Client approval zaroori hai
    if (!escrow.clientApproved) {
      return res.status(400).json({ message: "Client approval required before releasing 70%" });
    }

    if (escrow.status === "disputed") {
      return res.status(400).json({ message: "Cannot release funds for disputed order" });
    }

    const manufacturer = await User.findById(escrow.manufacturerId);

    if (!manufacturer) {
      return res.status(404).json({ message: "Manufacturer not found" });
    }

    if (!manufacturer.wallet) {
      manufacturer.wallet = { balance: 0 };
    }

    manufacturer.wallet.balance += escrow.remainingAmount;
    await manufacturer.save();

    escrow.remainingReleased = true;
    escrow.status = "released";
    await escrow.save();

    res.json({
      message: "70% released successfully. Order complete!",
      escrow
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Dispute
const raiseDispute = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id);

    if (!escrow) {
      return res.status(404).json({ message: "Escrow not found" });
    }

    if (escrow.status === "released") {
      return res.status(400).json({ message: "Cannot dispute a completed order" });
    }

    escrow.status = "disputed";
    await escrow.save();

    res.json({
      message: "Dispute raised successfully",
      escrow
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Dummy Payment
const jazzcashPayment = async (req, res) => {
  try {
    res.json({ message: "JazzCash payment initiated" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// EXPORTS
module.exports = {
  createEscrow,
  releaseAdvance,
  clientApproval,
  releaseRemaining,
  raiseDispute,
  jazzcashPayment,
  jazzcashCallback
};