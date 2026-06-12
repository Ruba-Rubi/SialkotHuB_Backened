const mongoose = require('mongoose');

const connectDB = async () => {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/SialkotHub';
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log("✅ Database Connected Successfully!");
    } catch (err) {
        console.error("❌ Database Connection Failed:", err.message);
        process.exit(1);
    }
};

module.exports = connectDB;