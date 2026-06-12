const User = require('../Users');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const CNIC_SERVICE_URL = process.env.CNIC_SERVICE_URL || 'http://localhost:8000';

// 1. REGISTER USER
exports.registerUser = async (req, res) => {
    const {
        name,
        email,
        password,
        role,
        city,
        cnic,
        dob,
        expiry,
        selfie,
        policiesAccepted,

        // Support both frontend naming styles
        cnicFront,
        cnicBack,
        cnic_front,
        cnic_back
    } = req.body;

    console.log("Registering and Verifying:", email);

    try {
        if (!name || !email || !password || !role) {
            return res.status(400).json({
                message: 'Name, email, password, and role are required.'
            });
        }

        if (!policiesAccepted) {
            return res.status(400).json({ message: 'You must accept the platform policies to register.' });
        }

        const normalizedEmail = email.toLowerCase();

        let user = await User.findOne({ email: normalizedEmail });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const cnicFrontImage = cnicFront || cnic_front;
        const cnicBackImage = cnicBack || cnic_back;
        const selfieImage = selfie;

        if (!cnicFrontImage || !cnicBackImage || !selfieImage || !cnic || !dob) {
            return res.status(400).json({
                message: 'CNIC front, CNIC back, selfie, CNIC number, and DOB are required.'
            });
        }

        let aiScore = 0;
        let aiDecision = 'PENDING';
        let aiFullResult = null;

        try {
            console.log("Sending data to Python AI Backend:", CNIC_SERVICE_URL);

            const aiResponse = await axios.post(`${CNIC_SERVICE_URL}/api/verify`, {
                cnic_front: cnicFrontImage,
                cnic_back: cnicBackImage,
                selfie: selfieImage,
                user_name: name,
                user_cnic: cnic,
                user_dob: dob,
                user_expiry: expiry || null,
                user_id: normalizedEmail
            }, {
                timeout: 120000,
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });

            if (!aiResponse.data || !aiResponse.data.success || !aiResponse.data.result) {
                return res.status(400).json({
                    message: aiResponse.data?.message || 'AI verification failed.'
                });
            }

            const aiResult = aiResponse.data.result;
            aiFullResult = aiResult;
            aiScore = aiResult.final_score || 0;
            aiDecision = aiResult.final_decision || 'PENDING';

            console.log(`AI Result: ${aiDecision} with Score: ${aiScore}`);

            if (aiDecision === 'FAKE') {
                return res.status(400).json({
                    message: 'Verification Failed: Your documents appear to be invalid or fake.',
                    cnicVerification: aiFullResult
                });
            }
        } catch (aiErr) {
            console.error("AI Backend Error:", aiErr.response?.data || aiErr.message);

            return res.status(500).json({
                message: 'AI Verification Server error.',
                details: aiErr.response?.data?.detail || aiErr.response?.data?.message || aiErr.message
            });
        }

        user = new User({
            name,
            email: normalizedEmail,
            password,
            role,
            cnic,
            dob,
            address: { city: city || "" },
            isVerified: aiDecision !== 'FAKE',
            trustScore: Math.round(aiScore),
            verificationStatus: aiDecision,
            cnicVerification: aiFullResult,
            policiesAccepted: true
        });

        await user.save();

        console.log("User registered successfully with Trust Score:", aiScore);

        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(payload, process.env.JWT_SECRET || 'secret123', { expiresIn: '10h' }, (err, token) => {
            if (err) throw err;

            const newUser = {
                id: user.id,
                name: user.name,
                role: user.role,
                trustScore: user.trustScore,
                verificationStatus: user.verificationStatus,
                city: user.address?.city || '',
                skills: user.skills || [],
                companyName: user.companyName || '',
            };

            const io = req.app.get('io');
            if (io) io.emit('new_user_registered', newUser);

            res.json({ token, user: newUser });
        });
    } catch (err) {
        console.error("Registration Error:", err.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

// 2. LOGIN USER
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    console.log("Login Attempt:", email);

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const normalizedEmail = email.toLowerCase();

        let user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            console.log("User not found");
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        if (user.password !== password) {
            console.log("Password mismatch");
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        console.log("Login Success! Role:", user.role);

        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(payload, process.env.JWT_SECRET || 'secret123', { expiresIn: '10h' }, (err, token) => {
            if (err) throw err;

            res.json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    trustScore: user.trustScore,
                    verificationStatus: user.verificationStatus
                }
            });
        });
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

// 3. GET USERS (role filter optional)
exports.getUsers = async (req, res) => {
    try {
        const { role } = req.query;
        const query = role ? { role } : {};
        const users = await User.find(query, 'name role trustScore isVerified address skills companyName createdAt');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};