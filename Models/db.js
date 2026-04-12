const mongoose = require('mongoose');

// Database connect karne ka function
const connectDB = async () => {
    try {
        // process.env.MONGO_URI aapki .env file se connection string uthaye ga
        const conn = await mongoose.connect(process.env.MONGO_URI);
        
        console.log(`MongoDB Connected Successfully: ${conn.connection.host}`);
    } catch (err) {
        console.error(`Error: ${err.message}`);
        // Agar connection fail ho jaye toh process band kar do
        process.exit(1);
    }
};

module.exports = connectDB;