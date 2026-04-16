require('dotenv').config();
const express = require('express'); 
const connectDB = require('./Models/db'); 
const cors = require('cors');
const http = require('http'); 
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// 1. SOCKET.IO CONFIGURATION (Port 3000 ke liye update kiya)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", 
        methods: ["GET", "POST"]
    }
});

connectDB();

// 2. CORS MIDDLEWARE (Isey Routes se pehle hona chahiye)
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use(express.json());

// 3. ROUTES
app.use('/api/auth', require('./Models/routes/authRoutes'));
app.use('/api/messages', require('./Models/routes/messageRoutes'));
app.use('/api/reviews', require('./Models/routes/reviewRoutes'));

app.get('/', (req, res) => {
    res.send("Sialkot Trade Trust Hub Server is Running...");
});

// --- SOCKET.IO LOGIC ---
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

// 4. SERVER START (Hamesha aakhir mein)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));