const Review = require('../Reviews');
const User = require('../Users');

const HUGGING_FACE_URL = 'https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli';

const analyzeSentiment = async (comment) => {
    const token = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;

    if (!token) {
        return {
            sentimentLabel: 'neutral',
            aiConfidence: 0,
            warning: 'AI token missing, review saved without AI analysis'
        };
    }

    const response = await fetch(HUGGING_FACE_URL, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
            inputs: comment,
            parameters: { candidate_labels: ['positive', 'negative'] }
        }),
    });

    const aiResult = await response.json();

    if (!response.ok || !aiResult || aiResult.error || !Array.isArray(aiResult.labels)) {
        throw new Error(aiResult.error || 'AI response invalid');
    }

    return {
        sentimentLabel: aiResult.labels[0],
        aiConfidence: aiResult.scores?.[0] || 0
    };
};

exports.addReview = async (req, res) => {
    try {
        const { revieweeId, rating, comment } = req.body;

        if (!revieweeId || !rating || !comment) {
            return res.status(400).json({ message: 'revieweeId, rating, and comment are required' });
        }

        const numericRating = Number(rating);
        if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        const { sentimentLabel, aiConfidence, warning } = await analyzeSentiment(comment);

        const newReview = new Review({
            reviewer: req.user.id,
            reviewee: revieweeId,
            rating: numericRating,
            comment,
            sentimentLabel,
            sentimentScore: aiConfidence
        });
        await newReview.save();

        const user = await User.findById(revieweeId);
        let statusMessage = 'Review added successfully!';

        if (user) {
            if (Number.isNaN(user.trustScore)) user.trustScore = 50;

            if (sentimentLabel === 'positive' && numericRating >= 4) {
                user.trustScore += aiConfidence * 2;
            } else if (sentimentLabel === 'negative' && numericRating <= 2) {
                user.trustScore -= aiConfidence * 2;
            } else if (sentimentLabel === 'negative' && numericRating >= 4) {
                user.trustScore -= 5;
                statusMessage = 'Warning: Sentiment-rating mismatch detected. Trust score penalized.';
            } else if (sentimentLabel === 'positive' && numericRating <= 2) {
                user.trustScore -= 2;
                statusMessage = 'Review added, but inconsistent rating detected.';
            }

            user.trustScore = Math.max(0, Math.min(100, user.trustScore));
            user.totalReviews = (user.totalReviews || 0) + 1;
            await user.save();
        }

        res.status(201).json({
            message: warning || statusMessage,
            review: newReview,
            sentiment: sentimentLabel,
            confidence: `${(aiConfidence * 100).toFixed(1)}%`,
            ratingProvided: numericRating,
            newTrustScore: user ? Number(user.trustScore.toFixed(2)) : null
        });
    } catch (err) {
        console.error('Review Error:', err.message);
        res.status(500).json({ error: `Analysis failed: ${err.message}` });
    }
};
