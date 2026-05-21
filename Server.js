const express = require('express');
require('dotenv').config();

const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./Models/db');

// Routes Imports
const authRoutes = require('./Models/routes/authRoutes');
const escrowRoutes = require('./Models/routes/escrowroutes');
const withdrawRoutes = require('./Models/routes/withdrawRoutes');
const messageRoutes = require('./Models/routes/messageRoutes');
const reviewRoutes = require('./Models/routes/reviewRoutes');
const disputeRoutes = require('./Models/routes/disputeRoutes');
// const cnicRoutes = require('./routes/cnicRoutes');

const app = express();
const server = http.createServer(app);

// DATABASE CONNECT
connectDB();

// MIDDLEWARE
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// SOCKET.IO SETUP
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// API ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/withdraw', withdrawRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/dispute', disputeRoutes);
// app.use('/api/cnic', cnicRoutes);

// TEST ROUTES
app.get('/', (req, res) => {
  res.send('Sialkot Trade Trust Hub Server is Running...');
});

app.get('/api/message', (req, res) => {
  res.json({ text: 'Hello! Backend se link ho gaya!' });
});

// SOCKET.IO LOGIC
io.on('connection', (socket) => {
  console.log('User Connected:', socket.id);

  socket.on('join_chat', (orderId) => {
    socket.join(orderId);
  });

  socket.on('send_message', (data) => {
    socket.to(data.orderId).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('User Disconnected:', socket.id);
  });
});

// SERVER START
const PORT = process.env.PORT || 5003;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});