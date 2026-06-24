const express = require('express');
require('dotenv').config();

const cors    = require('cors');
const http    = require('http');
const { Server } = require('socket.io');
const connectDB = require('./Models/db');
const { processMessage } = require('./Models/services/MessageService');

// Routes
const authRoutes    = require('./Models/routes/authRoutes');
const escrowRoutes  = require('./Models/routes/escrowroutes');
const withdrawRoutes = require('./Models/routes/withdrawRoutes');
const messageRoutes = require('./Models/routes/messageroutes');
const reviewRoutes  = require('./Models/routes/reviewRoutes');
const disputeRoutes = require('./Models/routes/disputeRoutes');
const orderRoutes   = require('./Models/routes/orderRoutes');
const adminRoutes   = require('./Models/routes/adminRoutes');

const app    = express();
const server = http.createServer(app);

connectDB();

const PORT = process.env.PORT || 5001;
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
];

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use('/uploads', require('express').static(require('path').join(__dirname, 'uploads')));

const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'], credentials: true },
});

app.set('io', io);

// API Routes
app.use('/api/auth',     authRoutes);
app.use('/api/escrow',   escrowRoutes);
app.use('/api/withdraw', withdrawRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews',  reviewRoutes);
app.use('/api/dispute',  disputeRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/admin',    adminRoutes);

app.get('/', (req, res) => res.send('Skillora Backend Running...'));

// ─── Socket.IO ─────────────────────────────────────────────────────────────────
// Uses the SAME processMessage() as REST — guaranteed single save, same logic.
io.on('connection', (socket) => {
  console.log('[Socket] Connected:', socket.id);

  socket.on('join_chat', (orderId) => {
    socket.join(orderId);
    console.log(`[Socket] ${socket.id} joined room: ${orderId}`);
  });

  // notify_message: frontend sends this AFTER REST POST succeeds.
  // Message is already saved — just broadcast to the room, no DB write.
  socket.on('notify_message', (savedMessage) => {
    socket.to(savedMessage.orderId).emit('receive_message', savedMessage);
  });

  // send_message: kept for any direct socket-only clients (runs full processMessage pipeline)
  socket.on('send_message', async (data) => {
    const { sender, receiver, orderId, message } = data;

    try {
      // Verify sender belongs to this order
      const Order = require('./Models/Orders');
      const order = await Order.findById(orderId);
      if (!order) return socket.emit('message_error', { error: 'Order not found' });

      const members = [
        String(order.clientId),
        order.manufacturerId ? String(order.manufacturerId) : null,
        order.labourId       ? String(order.labourId)       : null,
      ].filter(Boolean);

      if (!members.includes(String(sender))) {
        return socket.emit('message_error', { error: 'Not authorized for this order chat' });
      }

      const result = await processMessage({ sender, receiver, orderId, message });
      const { savedMessage, aiStatus, aiConfidence, dispute } = result;

      // Broadcast to room (excluding sender)
      socket.to(orderId).emit('receive_message', {
        _id:         savedMessage._id,
        sender,
        receiver,
        orderId,
        message,
        createdAt:   savedMessage.createdAt,
        aiStatus,
      });

      // Confirm to sender
      socket.emit('message_saved', {
        _id:         savedMessage._id,
        createdAt:   savedMessage.createdAt,
        aiStatus,
        aiConfidence,
        ...(dispute && {
          aiWarning:  'Dispute detected by Skillora AI',
          warnings:   dispute.warningCount,
          adminAlert: dispute.adminNotified,
        }),
      });

    } catch (err) {
      // Differentiate warning vs lock vs server error for frontend
      socket.emit('message_error', {
        error:       err.message,
        locked:      err.locked      || false,
        isWarning:   err.isWarning   || false,
        warningCount: err.warningCount || null,
      });
    }
  });

  socket.on('leave_chat', (orderId) => {
    socket.leave(orderId);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Skillora Server running on port ${PORT}`);
});
