require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./Models/db');

connectDB();

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

const authRoutes = require('./Models/routes/authRoutes');
const escrowRoutes = require('./Models/routes/escrowroutes');
const withdrawRoutes = require('./Models/routes/withdrawRoutes');
const messageRoutes = require('./Models/routes/messageroutes');
const reviewRoutes = require('./Models/routes/reviewRoutes');
const disputeRoutes = require('./Models/routes/disputeRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/withdraw', withdrawRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/dispute', disputeRoutes);

app.get('/', (req, res) => {
  res.send('Sialkot Trade Trust Hub Server is Running...');
});

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on('join_chat', (orderId) => {
    socket.join(orderId);
  });

  socket.on('send_message', (data) => {
    socket.to(data.orderId).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('User Disconnected');
  });
});

const PORT = process.env.PORT || 5002;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
