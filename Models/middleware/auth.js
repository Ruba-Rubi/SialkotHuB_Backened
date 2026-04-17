const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // 1. Header se token nikalna (Standard Bearer Format)
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const token = authHeader.split(' ')[1]; // 'Bearer <token>' mein se sirf token nikalna

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Important: Check karein aapka token 'user' bhej raha hai ya direct 'id'
        req.user = decoded.user || decoded; 
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};