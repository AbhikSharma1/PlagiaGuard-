const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const {
  uploadDocument, getDocuments, getDocument, deleteDocument, getDashboardStats
} = require('../controllers/documentController');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const ALLOWED = [
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    ALLOWED.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only .txt, .pdf, .docx files allowed')),
});

const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, err => {
    if (err) return res.status(400).json({ message: err.message || 'File upload error' });
    next();
  });
};

router.get('/stats', auth, getDashboardStats);
router.post('/upload', auth, handleUpload, uploadDocument);
router.get('/', auth, getDocuments);
router.get('/:id', auth, getDocument);
router.delete('/:id', auth, deleteDocument);

module.exports = router;
