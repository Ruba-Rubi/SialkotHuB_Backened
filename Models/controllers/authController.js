// Import User model
const User = require('../Users');

// Import JWT for authentication tokens
const jwt = require('jsonwebtoken');

// Import Axios for calling the Python AI verification service
const axios = require('axios');

// CNIC Verification Service URL (Python Backend)
const CNIC_SERVICE_URL = process.env.CNIC_SERVICE_URL || 'http://localhost:8000';


// ======================================================
// 1. REGISTER USER
// ======================================================
exports.registerUser = async (req, res) => {

    // Extract user data from request body
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

        // Validate required registration fields
        if (!name || !email || !password || !role) {
            return res.status(400).json({
                message: 'Name, email, password, and role are required.'
            });
        }

        // Ensure user accepted platform policies
        if (!policiesAccepted) {
            return res.status(400).json({
                message: 'You must accept the platform policies to register.'
            });
        }

        // Convert email to lowercase for consistency
        const normalizedEmail = email.toLowerCase();

        // Check if user already exists
        let user = await User.findOne({ email: normalizedEmail });

        if (user) {
            return res.status(400).json({
                message: 'User already exists'
            });
        }

        // Support different frontend field naming conventions
        const cnicFrontImage = cnicFront || cnic_front;
        const cnicBackImage = cnicBack || cnic_back;
        const selfieImage = selfie;

        // Validate CNIC and selfie data
        if (!cnicFrontImage || !cnicBackImage || !selfieImage || !cnic || !dob) {
            return res.status(400).json({
                message: 'CNIC front, CNIC back, selfie, CNIC number, and DOB are required.'
            });
        }

        // Default AI verification values
        let aiScore = 0;
        let aiDecision = 'PENDING';
        let aiFullResult = null;

        try {

            // Send CNIC and selfie data to Python AI verification service
            console.log("Sending data to Python AI Backend:", CNIC_SERVICE_URL);

            const aiResponse = await axios.post(
                `${CNIC_SERVICE_URL}/api/verify`,
                {
                    cnic_front: cnicFrontImage,
                    cnic_back: cnicBackImage,
                    selfie: selfieImage,
                    user_name: name,
                    user_cnic: cnic,
                    user_dob: dob,
                    user_expiry: expiry || null,
                    user_id: normalizedEmail
                },
                {
                    timeout: 120000,
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity
                }
            );

            // Validate AI service response
            if (!aiResponse.data || !aiResponse.data.success || !aiResponse.data.result) {
                return res.status(400).json({
                    message: aiResponse.data?.message || 'AI verification failed.'
                });
            }

            // Extract AI verification results
            const aiResult = aiResponse.data.result;

            aiFullResult = aiResult;
            aiScore = aiResult.final_score || 0;
            aiDecision = aiResult.final_decision || 'PENDING';

            console.log(`AI Result: ${aiDecision} with Score: ${aiScore}`);

            // Reject registration if AI marks documents as fake
            if (aiDecision === 'FAKE') {
                return res.status(400).json({
                    message: 'Verification Failed: Your documents appear to be invalid or fake.',
                    cnicVerification: aiFullResult
                });
            }

        } catch (aiErr) {

            // Handle AI service errors
            console.error(
                "AI Backend Error:",
                aiErr.response?.data || aiErr.message
            );

            return res.status(500).json({
                message: 'AI Verification Server error.',
                details:
                    aiErr.response?.data?.detail ||
                    aiErr.response?.data?.message ||
                    aiErr.message
            });
        }

        // Create new user record
        user = new User({
            name,
            email: normalizedEmail,
            password,
            role,
            cnic,
            dob,

            // Store city inside address object
            address: {
                city: city || ""
            },

            // Verification status based on AI decision
            isVerified: aiDecision !== 'FAKE',

            // AI-generated trust score
            trustScore: Math.round(aiScore),

            // Verification result (REAL / REVIEW / FAKE)
            verificationStatus: aiDecision,

            // Full AI verification response
            cnicVerification: aiFullResult,

            // User accepted platform policies
            policiesAccepted: true
        });

        // Save user in MongoDB
        await user.save();

        console.log(
            "User registered successfully with Trust Score:",
            aiScore
        );

        // JWT payload
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        // Generate authentication token
        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret123',
            { expiresIn: '10h' },
            (err, token) => {

                if (err) throw err;

                // User data returned to frontend
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

                // Broadcast new user registration via Socket.IO
                const io = req.app.get('io');

                if (io) {
                    io.emit('new_user_registered', newUser);
                }

                // Return token and user info
                res.json({
                    token,
                    user: newUser
                });
            }
        );

    } catch (err) {

        // General registration error
        console.error("Registration Error:", err.message);

        res.status(500).json({
            message: 'Server Error'
        });
    }
};


// ======================================================
// 2. LOGIN USER
// ======================================================
exports.loginUser = async (req, res) => {

    // Extract login credentials
    const { email, password } = req.body;

    console.log("Login Attempt:", email);

    // Validate credentials
    if (!email || !password) {
        return res.status(400).json({
            message: 'Email and password are required.'
        });
    }

    try {

        // Normalize email
        const normalizedEmail = email.toLowerCase();

        // Find user in database
        let user = await User.findOne({
            email: normalizedEmail
        });

        // User not found
        if (!user) {
            console.log("User not found");

            return res.status(400).json({
                message: 'Invalid Credentials'
            });
        }

        // Password validation
        if (user.password !== password) {

            console.log("Password mismatch");

            return res.status(400).json({
                message: 'Invalid Credentials'
            });
        }

        console.log("Login Success! Role:", user.role);

        // JWT payload
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        // Generate login token
        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret123',
            { expiresIn: '10h' },
            (err, token) => {

                if (err) throw err;

                // Return token and user details
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
            }
        );

    } catch (err) {

        // Login error handling
        console.error("Login Error:", err.message);

        res.status(500).json({
            message: 'Server Error'
        });
    }
};


// ======================================================
// 3. GET USERS
// ======================================================
exports.getUsers = async (req, res) => {

    try {

        // Optional role filter
        const { role } = req.query;

        const query = role ? { role } : {};

        // Fetch selected user fields only
        const users = await User.find(
            query,
            'name role trustScore isVerified address skills companyName createdAt'
        );

        // Return users list
        res.json(users);

    } catch (err) {

        // Error fetching users
        res.status(500).json({
            message: 'Server Error'
        });
    }
};