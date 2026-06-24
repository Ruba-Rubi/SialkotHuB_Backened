const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const controller = require('../controllers/DisputeController');

// ── File upload setup ──────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'disputes');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only images and PDFs allowed'));
  },
});

router.post('/upload-evidence', upload.array('files', 10), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ success: false, message: 'No files received' });
  const urls = req.files.map(f => `/uploads/disputes/${f.filename}`);
  res.json({ success: true, urls });
});

router.post('/create', controller.createDispute);
router.put('/resolve/:id', controller.resolveDispute);
router.get('/', controller.getAllDisputes);
module.exports = router;
