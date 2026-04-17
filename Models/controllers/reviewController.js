const Review = require('../models/Reviews'); 
const User = require('../models/Users');

exports.addReview = async (req, res) => {
    try {
        const { revieweeId, rating, comment } = req.body;
        const token = "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";
        const url = "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli";

        // 1. AI Analysis Call
        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
                "inputs": comment,
                "parameters": { "candidate_labels": ["positive", "negative"] }
            }),
        });

        const aiResult = await response.json();
        
        // AI result se top label nikalna
        // Bart model array return karta hai: [{label: 'positive', score: 0.9}, ...]
        const topResult = aiResult[0]; 
        const sentimentLabel = topResult.label; // 'positive' ya 'negative'

        // 2. Save Review to Database
        const newReview = new Review({
            reviewer: req.user.id,
            reviewee: revieweeId,
            rating,
            comment,
            sentimentLabel: sentimentLabel,
            aiScore: topResult.score
        });
        await newReview.save();

        // 3. Trust Score Logic
        const user = await User.findById(revieweeId);
        if (user) {
            // Agar AI positive kahe aur rating 4+ ho toh +2 points
            if (sentimentLabel === "positive" && rating >= 4) {
                user.trustScore += 2;
            } 
            // Agar AI negative kahe ya rating boht kam ho toh -2 points
            else if (sentimentLabel === "negative" || rating <= 2) {
                user.trustScore -= 2;
            }
            
            // Score ko 0-100 ki range mein rakhna
            user.trustScore = Math.max(0, Math.min(100, user.trustScore));
            await user.save();
        }

        res.status(201).json({ 
            message: "Review added and Trust Score updated!",
            sentiment: sentimentLabel,
            newTrustScore: user.trustScore 
        });

    } catch (err) {
        console.error("Review Error:", err);
        res.status(500).json({ error: "AI Analysis failed but review saved." });
    }
};