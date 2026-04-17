const User = require("../Users");

const withdraw = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const { amount } = req.body;

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.wallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // 💰 deduct money
    user.wallet.balance -= amount;
    await user.save();

    // (future integration: JazzCash payout)
    console.log(`Withdraw ${amount} for ${user.name}`);

    res.json({
      message: "Withdraw successful",
      remainingBalance: user.wallet.balance
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { withdraw };