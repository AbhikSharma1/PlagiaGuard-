const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Document = require('../models/Document');
const { splitIntoChunks, analyzeChunks, calcOverallScore } = require('./similarityEngine');

async function extractText(filePath, mimetype) {
  if (mimetype === 'text/plain') {
    return fs.readFileSync(filePath, 'utf-8');
  }
  if (mimetype === 'application/pdf') {
    const data = await pdfParse(fs.readFileSync(filePath));
    return data.text;
  }
  if (mimetype.includes('wordprocessingml') || mimetype.includes('msword')) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }
  throw new Error('Unsupported file type');
}

async function buildReferenceChunks(userId, excludeId) {
  // Only use completed docs that have stored embeddings
  const docs = await Document.find({
    userId,
    status: 'completed',
    _id: { $ne: excludeId },
  }).select('originalName chunks');

  const refs = [];
  docs.forEach(doc => {
    doc.chunks.forEach(chunk => {
      if (chunk.embedding && chunk.embedding.length > 0) {
        refs.push({
          text: chunk.text,
          embedding: chunk.embedding,
          source: doc.originalName,
        });
      }
    });
  });
  return refs;
}

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { originalname, mimetype, path: filePath, filename } = req.file;

    const fullText = await extractText(filePath, mimetype);
    if (!fullText.trim()) return res.status(400).json({ message: 'Could not extract text from file' });

    const doc = await Document.create({
      userId: req.user.id,
      filename,
      originalName: originalname,
      fileType: mimetype,
      fullText,
      chunks: [],
      status: 'processing',
    });

    // Async AI processing — don't block the HTTP response
    (async () => {
      try {
        const rawChunks = splitIntoChunks(fullText);
        const refChunks = await buildReferenceChunks(req.user.id, doc._id);

        // analyzeChunks returns chunks with matchType, score, etc.
        // We also need to store embeddings — get them from the engine
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const embModel = genAI.getGenerativeModel({ model: 'models/gemini-embedding-001' });

        // Embed all chunks for storage
        const chunkEmbeddings = [];
        for (const chunk of rawChunks) {
          const result = await embModel.embedContent(chunk);
          chunkEmbeddings.push(result.embedding.values);
          await new Promise(r => setTimeout(r, 50));
        }

        // Build reference embeddings from stored data (no re-embedding needed)
        const refEmbeddingsData = refChunks.map(r => ({ text: r.text, embedding: r.embedding, source: r.source }));

        // Compute similarity using pre-computed embeddings
        function cosine(a, b) {
          let dot = 0, mA = 0, mB = 0;
          for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; mA += a[i]*a[i]; mB += b[i]*b[i]; }
          return (!mA || !mB) ? 0 : dot / (Math.sqrt(mA) * Math.sqrt(mB));
        }

        const analyzed = rawChunks.map((chunk, i) => {
          let bestScore = 0, bestSource = null;
          refEmbeddingsData.forEach(ref => {
            const score = cosine(chunkEmbeddings[i], ref.embedding);
            if (score > bestScore) { bestScore = score; bestSource = ref.source; }
          });
          const matchType = bestScore >= 0.90 ? 'exact' : bestScore >= 0.60 ? 'paraphrase' : 'original';
          return {
            text: chunk,
            index: i,
            similarityScore: Math.round(bestScore * 100),
            matchType,
            matchedSource: matchType !== 'original' ? bestSource : null,
            embedding: chunkEmbeddings[i],
          };
        });

        const overallScore = calcOverallScore(analyzed);
        await Document.findByIdAndUpdate(doc._id, {
          chunks: analyzed,
          overallScore,
          status: 'completed',
        });
      } catch (e) {
        console.error('AI processing error:', e.message);
        await Document.findByIdAndUpdate(doc._id, {
          status: 'failed',
          errorMessage: e.message,
        });
      }
    })();

    res.status(201).json({ message: 'File uploaded, AI analysis started', documentId: doc._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ userId: req.user.id })
      .select('-fullText -chunks')
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user.id })
      .select('-chunks.embedding'); // Don't send embeddings to frontend (large arrays)
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    const filePath = path.join(__dirname, '../uploads', doc.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const docs = await Document.find({ userId: req.user.id, status: 'completed' })
      .select('overallScore originalName createdAt');
    const avg = docs.length
      ? Math.round(docs.reduce((s, d) => s + d.overallScore, 0) / docs.length)
      : 0;
    res.json({ totalScans: docs.length, averageScore: avg, recentScans: docs.slice(0, 5) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
