const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Is baar hum localhost use karenge
        await mongoose.connect('mongodb://localhost:27017/SialkotHub', {
            serverSelectionTimeoutMS: 5000,
        }); 
        console.log("✅ Database Connected Successfully!");
    } catch (err) {
        // Agar localhost fail ho jaye toh IPv6 try karein (New Node.js version ke liye)
        try {
            await mongoose.connect('mongodb://[::1]:27017/SialkotHub');
            console.log("✅ Database Connected Successfully (via IPv6)!");
        } catch (secondErr) {
            console.error("❌ Database Connection Failed!");
            console.log("Wajah:", secondErr.message);
        }
    }
};

module.exports = connectDB;