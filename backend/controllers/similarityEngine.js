const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: 'models/gemini-embedding-001' });

// Rate-limit: Gemini free tier allows ~1500 req/min, batch with small delay
async function getEmbedding(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

async function getEmbeddingsBatch(texts) {
  const embeddings = [];
  for (const text of texts) {
    const emb = await getEmbedding(text);
    embeddings.push(emb);
    // Small delay to avoid rate limiting on free tier
    await new Promise(r => setTimeout(r, 50));
  }
  return embeddings;
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function splitIntoChunks(text) {
  // Split on sentence boundaries, keep chunks > 20 chars
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);
}

function categorize(score) {
  if (score >= 0.90) return 'exact';
  if (score >= 0.60) return 'paraphrase';
  return 'original';
}

async function analyzeChunks(chunks, referenceChunks) {
  if (!chunks.length) return [];

  // Embed all new chunks
  const chunkEmbeddings = await getEmbeddingsBatch(chunks);

  // Embed reference chunks (only if any exist)
  let refEmbeddings = [];
  if (referenceChunks.length) {
    refEmbeddings = await getEmbeddingsBatch(referenceChunks.map(r => r.text));
  }

  return chunks.map((chunk, i) => {
    let bestScore = 0, bestSource = null;

    refEmbeddings.forEach((refEmb, j) => {
      const score = cosineSimilarity(chunkEmbeddings[i], refEmb);
      if (score > bestScore) {
        bestScore = score;
        bestSource = referenceChunks[j].source;
      }
    });

    const matchType = categorize(bestScore);
    return {
      text: chunk,
      index: i,
      similarityScore: Math.round(bestScore * 100),
      matchType,
      matchedSource: matchType !== 'original' ? bestSource : null,
    };
  });
}

function calcOverallScore(analyzedChunks) {
  if (!analyzedChunks.length) return 0;
  const flagged = analyzedChunks.filter(c => c.matchType !== 'original').length;
  return Math.round((flagged / analyzedChunks.length) * 100);
}

module.exports = { splitIntoChunks, analyzeChunks, calcOverallScore };
