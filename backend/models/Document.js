const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  text: String,
  index: Number,
  matchType: { type: String, enum: ['exact', 'paraphrase', 'original'], default: 'original' },
  similarityScore: { type: Number, default: 0 },
  matchedSource: { type: String, default: null },
  embedding: { type: [Number], default: [] }, // Gemini dense vector — stored for reuse
});

const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  fileType: { type: String, required: true },
  fullText: { type: String, required: true },
  chunks: [chunkSchema],
  overallScore: { type: Number, default: 0 },
  status: { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing' },
  errorMessage: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
