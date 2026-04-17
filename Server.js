require('dotenv').config();
const express = require('express'); 
const connectDB = require('./Models/db'); 
const cors = require('cors');

const app = express();

// Database Connection
connectDB();

app.use(cors());
app.use(express.json());

// --- YE LINE ABHI ADD KAREIN ---
app.use('/api/auth', require('./Models/routes/authRoutes'));

app.use('/api/reviews', require('./Models/routes/reviewRoutes'));

app.get('/', (req, res) => {
    res.send("Sialkot Trade Trust Hub Server is Running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

const messageRoutes = require('./Models/routes/messageroutes'); 
const disputeRoutes = require('./Models/routes/disputeRoutes');

app.use('/api/message', messageRoutes);
app.use('/api/dispute', disputeRoutes);