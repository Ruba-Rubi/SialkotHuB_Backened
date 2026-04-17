require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./Models/db");

// ROUTES
const authRoutes = require("./Models/routes/authRoutes");
const escrowRoutes = require("./Models/routes/escrowroutes");
const withdrawRoutes = require("./Models/routes/withdrawRoutes");
const messageRoutes = require("./Models/routes/messageRoutes");
const reviewRoutes = require("./Models/routes/reviewRoutes");

const app = express();
const server = http.createServer(app);

// 🟢 SOCKET.IO SETUP
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// 🟢 DB CONNECT
connectDB();

// 🟢 MIDDLEWARE
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());

// 🟢 ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/escrow", escrowRoutes);
app.use("/api/withdraw", withdrawRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reviews", reviewRoutes);

// 🟢 TEST ROUTE
app.get("/", (req, res) => {
  res.send("Sialkot Trade Trust Hub Server is Running...");
});

// 🟢 SOCKET.IO LOGIC
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_chat", (orderId) => {
    socket.join(orderId);
  });

  socket.on("send_message", (data) => {
    socket.to(data.orderId).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected");
  });
});

// 🟢 SERVER START
const PORT = process.env.PORT || 5000;
<<<<<<< HEAD
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

const messageRoutes = require('./Models/routes/messageroutes'); 
const disputeRoutes = require('./Models/routes/disputeRoutes');

app.use('/api/message', messageRoutes);
app.use('/api/dispute', disputeRoutes);
=======
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
>>>>>>> 6205038f0bf9f1979befe502aa1889c5d00bcf9d
