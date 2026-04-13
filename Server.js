require("dotenv").config();
const express = require("express");
const cors = require("cors");

const connectDB = require("./Models/db");

// Routes
const authRoutes = require("./Models/routes/authRoutes");
const escrowRoutes = require("./Models/routes/escrowroutes");
const withdrawRoutes = require("./Models/routes/withdrawRoutes");

const app = express();

// DB connection
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/escrow", escrowRoutes);
app.use("/api/withdraw", withdrawRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Sialkot Trade Trust Hub Server is Running...");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});