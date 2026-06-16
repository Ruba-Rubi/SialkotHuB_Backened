// Import Express framework
const express = require("express");

// Create Express Router instance
const router = express.Router();

// Import withdraw controller function
const { withdraw } = require("../controllers/withdrawController");

// ======================================================
// WITHDRAW ROUTE
// ======================================================
// POST /api/withdraw/:id
//
// Purpose:
// Process a withdrawal request for a specific user.
//
// :id = User ID or Wallet Owner ID
//
// Example:
// POST http://localhost:5003/api/withdraw/12345
//
// Controller Called:
// withdraw()
//
router.post("/:id", withdraw);

// Export router so it can be used in server.js
module.exports = router;