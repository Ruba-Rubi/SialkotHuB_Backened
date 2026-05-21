const Review = require("../Reviews");
const User = require("../Users");

// Multilingual sentiment (English + Urdu + Roman Urdu mix)
const HF_SENTIMENT_MODEL = "cardiffnlp/twitter-xlm-roberta-base-sentiment";
const HF_INFERENCE_URL = `https://router.huggingface.co/hf-inference/models/${HF_SENTIMENT_MODEL}`;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/** HF returns different shapes; normalize to [{ label, score }, ...] */
function normalizeClassificationOutput(aiResult) {
  if (!aiResult) return [];
  if (Array.isArray(aiResult)) {
    const first = aiResult[0];
    if (first && typeof first === "object" && Array.isArray(first.label_scores)) return first.label_scores;
    if (first && typeof first === "object" && "label" in first && "score" in first) return aiResult;
    if (first && typeof first === "object" && Array.isArray(first)) return first;
  }
  if (typeof aiResult === "object" && Array.isArray(aiResult.label_scores)) return aiResult.label_scores;
  return [];
}

/**
 * Map model outputs to 0–100 (higher = better sentiment).
 * Uses class probabilities when multiple labels exist; otherwise top-1 + confidence.
 */
function sentimentTo0to100(scoresList) {
  if (!scoresList.length) return 50;

  let pos = 0;
  let neu = 0;
  let neg = 0;

  for (const row of scoresList) {
    const label = String(row.label || "").toLowerCase();
    const s = Number(row.score) || 0;
    if (label.includes("pos")) pos += s;
    else if (label.includes("neg")) neg += s;
    else neu += s;
  }

  const sum = pos + neu + neg;
  if (sum > 0) {
    pos /= sum;
    neu /= sum;
    neg /= sum;
    return pos * 100 + neu * 50 + neg * 0;
  }

  const top = scoresList[0];
  const label = String(top.label || "").toLowerCase();
  const conf = clamp(Number(top.score) || 0.5, 0, 1);
  if (label.includes("pos")) return 50 + conf * 50;
  if (label.includes("neg")) return 50 - conf * 50;
  return 50;
}

function ratingTo0to100(rating) {
  return ((rating - 1) / 4) * 100;
}

async function fetchMultilingualSentiment(comment, token) {
  const response = await fetch(HF_INFERENCE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: comment }),
  });

  const raw = await response.json();
  if (!response.ok) {
    const msg = raw?.error || raw?.message || response.statusText;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  let list = normalizeClassificationOutput(raw);
  list = list
    .filter((x) => x && typeof x === "object")
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));

  const sentiment0to100 = sentimentTo0to100(list);
  const top = list[0] || { label: "unknown", score: 0 };
  return {
    sentiment0to100,
    sentimentLabel: String(top.label || "unknown"),
    modelTopScore: Number(top.score) || 0,
  };
}

exports.addReview = async (req, res) => {
  try {
    const { revieweeId, rating, comment } = req.body;

    if (!revieweeId || !comment || rating === undefined || rating === null) {
      return res.status(400).json({ error: "revieweeId, rating, and comment are required" });
    }

    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res.status(400).json({ error: "rating must be an integer between 1 and 5" });
    }

    const text = String(comment).trim();
    if (text.length < 2) {
      return res.status(400).json({ error: "comment is too short" });
    }

    if (String(revieweeId) === String(req.user.id)) {
      return res.status(400).json({ error: "You cannot review yourself" });
    }

    const reviewee = await User.findById(revieweeId);
    if (!reviewee) {
      return res.status(404).json({ error: "Reviewee not found" });
    }

    const hfToken = process.env.HF_API_TOKEN || process.env.HUGGINGFACE_API_KEY;
    let sentiment0to100 = 50;
    let sentimentLabel = "neutral";
    let modelTopScore = null;
    let sentimentSource = "fallback";

    if (hfToken) {
      try {
        const out = await fetchMultilingualSentiment(text, hfToken);
        sentiment0to100 = out.sentiment0to100;
        sentimentLabel = out.sentimentLabel;
        modelTopScore = out.modelTopScore;
        sentimentSource = "model";
      } catch (e) {
        console.error("Sentiment API error:", e.message);
        sentiment0to100 = ratingTo0to100(r);
        sentimentLabel = "fallback_rating_only";
        sentimentSource = "fallback";
      }
    } else {
      sentiment0to100 = ratingTo0to100(r);
      sentimentLabel = "fallback_rating_only";
      sentimentSource = "fallback";
    }

    const rating0to100 = ratingTo0to100(r);
    // Equal blend: stars + sentiment dono ka weight
    const combinedScore = clamp(0.5 * rating0to100 + 0.5 * sentiment0to100, 0, 100);

    const newReview = new Review({
      reviewer: req.user.id,
      reviewee: revieweeId,
      rating: r,
      comment: text,
      sentimentScore: sentiment0to100,
      sentimentLabel,
      combinedScore,
    });
    await newReview.save();

    const n = Number(reviewee.totalReviews) || 0;
    const prevTrust = Number(reviewee.trustScore) || 0;
    const newTrust = (prevTrust * n + combinedScore) / (n + 1);

    reviewee.trustScore = clamp(newTrust, 0, 100);
    reviewee.totalReviews = n + 1;
    await reviewee.save();

    return res.status(201).json({
      message: "Review added and trust score updated (running average)",
      sentiment: sentimentLabel,
      modelTopScore,
      sentimentScore0to100: sentiment0to100,
      ratingContribution0to100: rating0to100,
      combinedScore,
      sentimentSource,
      totalReviews: reviewee.totalReviews,
      newTrustScore: reviewee.trustScore,
    });
  } catch (err) {
    console.error("Review Error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
};
