const Review = require('../Reviews'); // Ek step peeche (Models folder mein)
const User = require('../Users');
const Sentiment = require('sentiment');
const sentiment = new Sentiment();

exports.addReview = async (req, res) => {
    try {
        const { revieweeId, rating, comment } = req.body;

        // 1. Run Sentimental Analysis on Comment
        const analysis = sentiment.analyze(comment);
        const score = analysis.score; // e.g., "Good" is +3, "Bad" is -3
        
        let label = 'Neutral';
        if (score > 0) label = 'Positive';
        else if (score < 0) label = 'Negative';

        // 2. Save Review with AI Results
        const newReview = new Review({
            reviewer: req.user.id,
            reviewee: revieweeId,
            rating,
            comment,
            sentimentScore: score,
            sentimentLabel: label
        });
        await newReview.save();

        // 3. Update User's Trust Score (The AI Formula)
        // Formula: (Rating influence 70%) + (Sentiment influence 30%)
        const user = await User.findById(revieweeId);
        
        // Purana score + Naya weighted score ka average
        const ratingWeight = (rating / 5) * 100; // Convert 5 stars to 100 scale
        const sentimentWeight = (score >= 0) ? 100 : 50; // Simple logic for demo

        const finalUpdate = (ratingWeight * 0.7) + (sentimentWeight * 0.3);
        
        // User ka Trust Score update karein
        user.trustScore = (user.trustScore + finalUpdate) / 2; 
        await user.save();

        res.status(201).json({ message: "Review added and Trust Score updated!", analysis: label });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};