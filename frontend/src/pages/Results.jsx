import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Download, AlertTriangle, CheckCircle,
  Copy, Cpu, LayoutList, Columns, FileDown
} from 'lucide-react';
import Navbar from '../components/Navbar';
import GlassCard from '../components/GlassCard';
import api from '../api';
import toast from 'react-hot-toast';

const SIZE = 180, STROKE = 14, R = (SIZE - STROKE) / 2, CIRC = 2 * Math.PI * R;

function ScoreRing({ score }) {
  const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f97316' : '#22c55e';
  const label = score >= 70 ? 'High Risk' : score >= 40 ? 'Moderate' : 'Low Risk';
  const offset = CIRC - (score / 100) * CIRC;
  return (
    <div className="relative flex items-center justify-center">
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#1e293b" strokeWidth={STROKE} />
        <motion.circle
          cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={color} strokeWidth={STROKE}
          strokeLinecap="round" strokeDasharray={CIRC}
          initial={{ strokeDashoffset: CIRC }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          className="text-4xl font-bold"
          style={{ color }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        >
          {score}%
        </motion.span>
        <span className="text-xs font-medium mt-0.5" style={{ color }}>{label}</span>
        <span className="text-xs text-slate-500 mt-0.5">similarity</span>
      </div>
    </div>
  );
}

const CHUNK_STYLES = {
  exact: {
    bg: 'bg-red-500/8 border-l-2 border-red-500/60',
    text: 'text-red-200',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
    label: 'Exact Match',
    dot: 'bg-red-400',
  },
  paraphrase: {
    bg: 'bg-orange-500/8 border-l-2 border-orange-500/60',
    text: 'text-orange-200',
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    label: 'Deep Paraphrase',
    dot: 'bg-orange-400',
  },
  original: {
    bg: '',
    text: 'text-slate-300',
    badge: 'bg-green-500/20 text-green-400 border-green-500/30',
    label: 'Original',
    dot: 'bg-green-400',
  },
};

function ChunkCard({ chunk, index }) {
  const s = CHUNK_STYLES[chunk.matchType];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.015 }}
      className={`px-5 py-4 rounded-xl mb-2 ${s.bg}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-xs text-slate-600 mt-1 shrink-0 w-5 text-right">{chunk.index + 1}</span>
          <p className={`text-sm leading-relaxed ${s.text}`}>{chunk.text}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${s.badge}`}>{s.label}</span>
          {chunk.matchType !== 'original' && (
            <span className="text-xs text-slate-500">{chunk.similarityScore}% match</span>
          )}
        </div>
      </div>
      {chunk.matchedSource && (
        <div className="mt-2 ml-8 flex items-center gap-1.5 text-xs text-slate-500">
          <AlertTriangle size={10} className="text-orange-400 shrink-0" />
          <span>Source: <span className="text-orange-400">{chunk.matchedSource}</span></span>
        </div>
      )}
    </motion.div>
  );
}

function SideBySideView({ chunks }) {
  const flagged = chunks.filter(c => c.matchType !== 'original');
  const original = chunks.filter(c => c.matchType === 'original');
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-sm font-medium text-slate-300">Flagged Sentences ({flagged.length})</span>
        </div>
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {flagged.length === 0 ? (
            <div className="text-center py-10 text-slate-600 text-sm">No flagged content</div>
          ) : flagged.map((c, i) => <ChunkCard key={c.index} chunk={c} index={i} />)}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-sm font-medium text-slate-300">Original Sentences ({original.length})</span>
        </div>
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {original.length === 0 ? (
            <div className="text-center py-10 text-slate-600 text-sm">No original content</div>
          ) : original.map((c, i) => <ChunkCard key={c.index} chunk={c} index={i} />)}
        </div>
      </div>
    </div>
  );
}

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'sidebyside'

  useEffect(() => {
    api.get(`/documents/${id}`)
      .then(r => setDoc(r.data))
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  }, [id]);

  const exportJSON = () => {
    const exportData = {
      document: doc.originalName,
      analyzedAt: doc.createdAt,
      overallSimilarity: `${doc.overallScore}%`,
      engine: 'Gemini gemini-embedding-001 (Semantic Cosine Similarity)',
      summary: {
        exact: doc.chunks.filter(c => c.matchType === 'exact').length,
        paraphrase: doc.chunks.filter(c => c.matchType === 'paraphrase').length,
        original: doc.chunks.filter(c => c.matchType === 'original').length,
      },
      chunks: doc.chunks.map(({ text, index, matchType, similarityScore, matchedSource }) => ({
        index, text, matchType, similarityScore, matchedSource,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PlagiaGuard-${doc.originalName}-report.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712]">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full"
        />
        <p className="text-slate-500 text-sm">Loading AI analysis...</p>
      </div>
    </div>
  );

  if (!doc) return null;

  const counts = {
    exact: doc.chunks.filter(c => c.matchType === 'exact').length,
    paraphrase: doc.chunks.filter(c => c.matchType === 'paraphrase').length,
    original: doc.chunks.filter(c => c.matchType === 'original').length,
  };

  const filtered = filter === 'all' ? doc.chunks : doc.chunks.filter(c => c.matchType === filter);

  return (
    <div className="min-h-screen bg-[#030712]">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/4 rounded-full blur-3xl" />
      </div>

      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 relative">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white truncate max-w-sm">{doc.originalName}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Cpu size={11} className="text-indigo-400" />
                <span className="text-xs text-indigo-400">Gemini Semantic Analysis</span>
                <span className="text-slate-600">·</span>
                <span className="text-xs text-slate-500">{new Date(doc.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <button
            onClick={exportJSON}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-indigo-400 text-sm transition-all"
          >
            <FileDown size={15} /> Export Report
          </button>
        </motion.div>

        {/* Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-6 flex flex-col items-center justify-center">
            <ScoreRing score={doc.overallScore} />
            <p className="text-slate-500 text-xs mt-3 text-center">
              {doc.chunks.length} sentences analyzed
            </p>
          </GlassCard>

          <GlassCard className="p-6 md:col-span-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">Breakdown</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Exact Matches', count: counts.exact, icon: <AlertTriangle size={18} />, color: 'text-red-400', bg: 'bg-red-500/15', bar: 'bg-red-500' },
                { label: 'Deep Paraphrase', count: counts.paraphrase, icon: <Copy size={18} />, color: 'text-orange-400', bg: 'bg-orange-500/15', bar: 'bg-orange-500' },
                { label: 'Original', count: counts.original, icon: <CheckCircle size={18} />, color: 'text-green-400', bg: 'bg-green-500/15', bar: 'bg-green-500' },
              ].map(({ label, count, icon, color, bg, bar }) => {
                const pct = doc.chunks.length ? Math.round((count / doc.chunks.length) * 100) : 0;
                return (
                  <div key={label} className="flex flex-col gap-3">
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color}`}>{icon}</div>
                    <div>
                      <span className={`text-2xl font-bold ${color}`}>{count}</span>
                      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${bar}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-xs text-slate-600">{pct}% of text</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Chunk Analysis */}
        <GlassCard className="overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-semibold text-white">Sentence Analysis</h2>
            <div className="flex items-center gap-3">
              {/* View toggle */}
              <div className="flex rounded-lg border border-slate-700 overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  title="List view"
                >
                  <LayoutList size={14} />
                </button>
                <button
                  onClick={() => setViewMode('sidebyside')}
                  className={`p-1.5 transition-colors ${viewMode === 'sidebyside' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  title="Side-by-side view"
                >
                  <Columns size={14} />
                </button>
              </div>

              {/* Filter tabs — only in list mode */}
              {viewMode === 'list' && (
                <div className="flex gap-1.5">
                  {[
                    { key: 'all', label: `All (${doc.chunks.length})` },
                    { key: 'exact', label: `Exact (${counts.exact})` },
                    { key: 'paraphrase', label: `Paraphrase (${counts.paraphrase})` },
                    { key: 'original', label: `Original (${counts.original})` },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setFilter(key)}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-all ${filter === key ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-4">
            <AnimatePresence mode="wait">
              {viewMode === 'sidebyside' ? (
                <motion.div key="side" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <SideBySideView chunks={doc.chunks} />
                </motion.div>
              ) : (
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="max-h-[600px] overflow-y-auto"
                >
                  {filtered.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">No chunks match this filter.</div>
                  ) : filtered.map((chunk, i) => (
                    <ChunkCard key={chunk.index} chunk={chunk} index={i} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>

        {/* Legend */}
        <div className="flex items-center gap-6 px-2 pb-4">
          {Object.entries(CHUNK_STYLES).map(([key, s]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-xs text-slate-500">{s.label}</span>
            </div>
          ))}
          <span className="text-xs text-slate-600 ml-auto flex items-center gap-1">
            <Cpu size={10} className="text-indigo-400" />
            Powered by Gemini gemini-embedding-001
          </span>
        </div>
      </div>
    </div>
  );
}
