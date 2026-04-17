const Escrow = require("../Escrow");
const User = require("../Users"); // ✅ correct import

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


// 30% Release
const releaseAdvance = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id);

    if (!escrow) {
      return res.status(404).json({ message: "Escrow not found" });
    }

    if (escrow.advanceReleased) {
      return res.status(400).json({ message: "Already released" });
    }

    const manufacturer = await User.findById(escrow.manufacturerId);

    if (!manufacturer) {
      return res.status(404).json({ message: "Manufacturer not found" });
    }

    // safe wallet check
    if (!manufacturer.wallet) {
      manufacturer.wallet = { balance: 0 };
    }

    manufacturer.wallet.balance += escrow.advanceAmount;
    await manufacturer.save();

    escrow.advanceReleased = true;

    // ❌ FIXED (no more partially_released)
    escrow.status = "paid";

    await escrow.save();

    res.json({
      message: "30% released successfully",
      escrow
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// 70% Release
const releaseRemaining = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id);

    if (!escrow) {
      return res.status(404).json({ message: "Escrow not found" });
    }

    if (escrow.remainingReleased) {
      return res.status(400).json({ message: "Already released" });
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

    // final completion status
    escrow.status = "released";

    await escrow.save();

    res.json({
      message: "70% released successfully",
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

    escrow.status = "disputed";
    await escrow.save();

    res.json({
      message: "Dispute raised",
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
  releaseRemaining,
  raiseDispute,
  jazzcashPayment,
  jazzcashCallback
};