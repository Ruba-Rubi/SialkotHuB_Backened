const User = require('../Users');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. REGISTER USER (Naye Token Format ke sath)
exports.registerUser = async (req, res) => {
    const { name, email, password, role, companyName, skills } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        user = new User({ name, email, password, role, companyName, skills });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        // Naya Payload structure: Is mein 'user' ka object hai jaisa aapki auth.js maang rahi hai
        const payload = { user: { id: user.id, role: user.role } };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '10h' }, (err, token) => {
            if (err) throw err;
            // Client ko token mil gaya
            res.json({ token }); 
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// 2. LOGIN USER (Ye lazmi hai taakay aap purane users se token le sakein)
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        // Check karein user hai ya nahi
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

        // Password match karein
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

        const payload = { user: { id: user.id, role: user.role } };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '10h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};