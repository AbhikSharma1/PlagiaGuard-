# PlagiaGuard — AI-Based Plagiarism & Similarity Detection System

## Project Structure
```
college-project/
├── backend/          # Node.js + Express + MongoDB
└── frontend/         # React + Vite + Tailwind CSS
```

## Prerequisites
- Node.js v18+
- MongoDB running locally on port 27017

## Setup & Run

### 1. Backend
```bash
cd backend
# Edit .env if needed (MONGO_URI, JWT_SECRET)
npm start
# Server runs on http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

## Features
- JWT Authentication (register/login)
- Drag-and-drop file upload (.txt, .pdf, .docx)
- AI Cosine Similarity engine — no external API needed
- Categorizes chunks: Exact Match / Paraphrase / Original
- Interactive results with score ring, per-sentence highlights
- Export report as JSON
- Dark glassmorphism UI with Framer Motion animations

## How Similarity Works
1. Uploaded text is split into sentences (>20 chars)
2. Each sentence is tokenized and TF-vectorized
3. Cosine similarity is computed against all previous submissions by the same user
4. Score ≥ 92% → Exact Match | 60–91% → Paraphrase | <60% → Original
5. Overall score = % of flagged chunks
