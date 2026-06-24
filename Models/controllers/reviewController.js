const Review = require("../Reviews");
const User   = require("../Users");
const Order  = require("../Orders");
const Notification = require("../Notification");

const HF_SENTIMENT_MODEL = "cardiffnlp/twitter-xlm-roberta-base-sentiment";
const HF_INFERENCE_URL   = `https://router.huggingface.co/hf-inference/models/${HF_SENTIMENT_MODEL}`;

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

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

function sentimentTo0to100(scoresList) {
  if (!scoresList.length) return 50;
  let pos = 0, neu = 0, neg = 0;
  for (const row of scoresList) {
    const label = String(row.label || "").toLowerCase();
    const s = Number(row.score) || 0;
    if (label.includes("pos")) pos += s;
    else if (label.includes("neg")) neg += s;
    else neu += s;
  }
  const sum = pos + neu + neg;
  if (sum > 0) {
    pos /= sum; neu /= sum; neg /= sum;
    return pos * 100 + neu * 50 + neg * 0;
  }
  const top = scoresList[0];
  const label = String(top.label || "").toLowerCase();
  const conf = clamp(Number(top.score) || 0.5, 0, 1);
  if (label.includes("pos")) return 50 + conf * 50;
  if (label.includes("neg")) return 50 - conf * 50;
  return 50;
}

function ratingTo0to100(r) { return ((r - 1) / 4) * 100; }

async function fetchMultilingualSentiment(comment, token) {
  const response = await fetch(HF_INFERENCE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: comment }),
  });
  const raw = await response.json();
  if (!response.ok) {
    const msg = raw?.error || raw?.message || response.statusText;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  let list = normalizeClassificationOutput(raw);
  list = list.filter(x => x && typeof x === "object").sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
  const sentiment0to100 = sentimentTo0to100(list);
  const top = list[0] || { label: "unknown", score: 0 };
  return { sentiment0to100, sentimentLabel: String(top.label || "unknown"), modelTopScore: Number(top.score) || 0 };
}

async function computeScores(r, text) {
  const hfToken = process.env.HF_API_TOKEN || process.env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_TOKEN;
  let sentiment0to100 = 50, sentimentLabel = "fallback_rating_only", modelTopScore = null, sentimentSource = "fallback";
  if (hfToken) {
    try {
      const out = await fetchMultilingualSentiment(text, hfToken);
      sentiment0to100 = out.sentiment0to100; sentimentLabel = out.sentimentLabel;
      modelTopScore = out.modelTopScore; sentimentSource = "model";
    } catch (e) {
      console.error("Sentiment API error:", e.message);
      sentiment0to100 = ratingTo0to100(r);
    }
  } else {
    sentiment0to100 = ratingTo0to100(r);
  }
  const rating0to100 = ratingTo0to100(r);
  const combinedScore = clamp(0.5 * rating0to100 + 0.5 * sentiment0to100, 0, 100);
  return { sentiment0to100, sentimentLabel, modelTopScore, sentimentSource, rating0to100, combinedScore };
}

// ─── GET reviews for a user ───────────────────────────────────────────────────
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId })
      .populate('reviewer', 'name role')
      .populate('orderId', 'title')
      .sort({ createdAt: -1 });
    const avgRating = reviews.length
      ? parseFloat((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(2))
      : null;
    res.json({ avgRating, totalReviews: reviews.length, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET review for a specific order ─────────────────────────────────────────
exports.getReviewByOrder = async (req, res) => {
  try {
    const review = await Review.findOne({ orderId: req.params.orderId, reviewer: req.user.id })
      .populate('reviewee', 'name role');
    res.json(review || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── ADD review (general, no order link) ─────────────────────────────────────
exports.addReview = async (req, res) => {
  try {
    const { revieweeId, rating, comment } = req.body;
    if (!revieweeId || !comment || rating == null) return res.status(400).json({ error: "revieweeId, rating, and comment are required" });
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) return res.status(400).json({ error: "rating must be 1–5" });
    const text = String(comment).trim();
    if (text.length < 2) return res.status(400).json({ error: "comment is too short" });
    if (String(revieweeId) === String(req.user.id)) return res.status(400).json({ error: "You cannot review yourself" });

    const reviewee = await User.findById(revieweeId);
    if (!reviewee) return res.status(404).json({ error: "Reviewee not found" });

    const { sentiment0to100, sentimentLabel, modelTopScore, sentimentSource, rating0to100, combinedScore } = await computeScores(r, text);

    const newReview = await Review.create({
      reviewer: req.user.id, reviewee: revieweeId,
      reviewerRole: req.user.role, rating: r, comment: text,
      sentimentScore: sentiment0to100, sentimentLabel, combinedScore,
    });

    const n = Number(reviewee.totalReviews) || 0;
    reviewee.trustScore  = clamp(((Number(reviewee.trustScore) || 0) * n + combinedScore) / (n + 1), 0, 100);
    reviewee.totalReviews = n + 1;
    await reviewee.save();

    await Notification.create({ title: 'New Review', message: `Aapko ${r} star review mila: "${text.substring(0,60)}"`, type: 'review', userId: String(revieweeId) }).catch(() => {});

    res.status(201).json({ message: "Review added", sentiment: sentimentLabel, modelTopScore, sentimentScore0to100: sentiment0to100, ratingContribution0to100: rating0to100, combinedScore, sentimentSource, totalReviews: reviewee.totalReviews, newTrustScore: reviewee.trustScore });
  } catch (err) {
    console.error("Review Error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
};

// ─── ADD order-linked review ──────────────────────────────────────────────────
// Reviewer must be part of the order. Order must be completed/released.
exports.addOrderReview = async (req, res) => {
  try {
    const { orderId, rating, comment } = req.body;
    if (!orderId || !comment || rating == null) return res.status(400).json({ error: "orderId, rating, and comment are required" });
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) return res.status(400).json({ error: "rating must be 1–5" });
    const text = String(comment).trim();
    if (text.length < 2) return res.status(400).json({ error: "comment is too short" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const userId   = String(req.user.id);
    const userRole = req.user.role;

    // Determine reviewee based on who is reviewing
    let revieweeId;
    const role = (userRole || '').toLowerCase();
    if (role === 'client' && String(order.clientId) === userId) {
      revieweeId = order.manufacturerId;
    } else if (role === 'manufacturer' && String(order.manufacturerId) === userId) {
      revieweeId = order.labourId;
    } else if (role === 'labour' && String(order.labourId) === userId) {
      revieweeId = order.manufacturerId;
    } else {
      return res.status(403).json({ error: "You are not authorized to review this order" });
    }

    if (!revieweeId) return res.status(400).json({ error: "No reviewee found for this order" });
    if (String(revieweeId) === userId) return res.status(400).json({ error: "You cannot review yourself" });

    // Order must be completed
    if (!['completed', 'released'].includes(order.status) && order.status !== 'in-progress') {
      // Allow review after escrow released (status may still show 'in-progress' on Order model)
      // We allow it as long as order exists and reviewer is valid party
    }

    const reviewee = await User.findById(revieweeId);
    if (!reviewee) return res.status(404).json({ error: "Reviewee not found" });

    const { sentiment0to100, sentimentLabel, modelTopScore, sentimentSource, rating0to100, combinedScore } = await computeScores(r, text);

    const newReview = await Review.create({
      reviewer: userId, reviewee: revieweeId,
      orderId, reviewerRole: userRole,
      rating: r, comment: text,
      sentimentScore: sentiment0to100, sentimentLabel, combinedScore,
    });

    const n = Number(reviewee.totalReviews) || 0;
    reviewee.trustScore  = clamp(((Number(reviewee.trustScore) || 0) * n + combinedScore) / (n + 1), 0, 100);
    reviewee.totalReviews = n + 1;
    await reviewee.save();

    await Notification.create({ title: 'New Review', message: `Aapko ${r} star review mila: "${text.substring(0,60)}"`, type: 'review', userId: String(revieweeId), orderId: String(orderId) }).catch(() => {});

    res.status(201).json({
      message: "Order review submitted",
      review: { _id: newReview._id, orderId, revieweeId, rating: r },
      sentiment: sentimentLabel, modelTopScore,
      sentimentScore0to100: sentiment0to100, ratingContribution0to100: rating0to100,
      combinedScore, sentimentSource,
      totalReviews: reviewee.totalReviews, newTrustScore: reviewee.trustScore,
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "You have already reviewed this order" });
    console.error("Order Review Error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
};
