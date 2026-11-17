import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, TrendingUp, Clock, Upload, ChevronRight,
  Trash2, RefreshCw, Cpu, Sparkles, AlertCircle
} from 'lucide-react';
import Navbar from '../components/Navbar';
import GlassCard from '../components/GlassCard';
import UploadZone from '../components/UploadZone';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function StatCard({ icon, label, value, color, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <GlassCard className="p-6 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function AIProcessingBadge() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Cpu size={12} className="text-indigo-400" />
      </motion.div>
      <span className="text-xs text-indigo-400 font-medium">AI Analyzing</span>
      <span className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-1 h-1 rounded-full bg-indigo-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </span>
    </div>
  );
}

function scoreColor(score) {
  if (score >= 70) return 'text-red-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-green-400';
}

function ScoreMini({ score }) {
  const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f97316' : '#22c55e';
  const r = 14, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      <svg width="40" height="40" className="-rotate-90 absolute">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#1e293b" strokeWidth="3" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="text-[10px] font-bold relative z-10" style={{ color }}>{score}%</span>
    </div>
  );
}

function statusBadge(status) {
  const map = {
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    processing: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return `text-xs px-2 py-0.5 rounded-full border ${map[status] || map.processing}`;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, docsRes] = await Promise.all([
        api.get('/documents/stats'),
        api.get('/documents'),
      ]);
      setStats(statsRes.data);
      setDocs(docsRes.data);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const processing = docs.some(d => d.status === 'processing');
    if (!processing) return;
    const t = setTimeout(fetchData, 3000);
    return () => clearTimeout(t);
  }, [docs, fetchData]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/documents/${id}`);
      toast.success('Deleted');
      fetchData();
    } catch { toast.error('Delete failed'); }
  };

  const handleUploaded = () => {
    setShowUpload(false);
    setTimeout(fetchData, 1500);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712]">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full"
        />
        <p className="text-slate-500 text-sm">Loading your workspace...</p>
      </div>
    </div>
  );

  const processingCount = docs.filter(d => d.status === 'processing').length;

  return (
    <div className="min-h-screen bg-[#030712]">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-3xl" />
      </div>

      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 relative">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-indigo-400" />
              <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider">AI-Powered</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">Welcome back, <span className="text-white">{user?.name}</span></p>
          </div>
          <div className="flex gap-3 items-center">
            {processingCount > 0 && <AIProcessingBadge />}
            <button onClick={fetchData} className="p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all">
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setShowUpload(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-500/20"
            >
              <Upload size={16} />
              New Scan
            </button>
          </div>
        </motion.div>

        {/* Upload Zone */}
        <AnimatePresence>
          {showUpload && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}
            >
              <GlassCard className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Cpu size={16} className="text-indigo-400" />
                  <h2 className="text-lg font-semibold text-white">Upload for AI Analysis</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 ml-auto">
                    Gemini Embeddings
                  </span>
                </div>
                <UploadZone onUploaded={handleUploaded} />
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard delay={0.1} icon={<FileText size={20} className="text-indigo-400" />} label="Total Scans" value={stats?.totalScans ?? 0} color="bg-indigo-500/20" />
          <StatCard delay={0.15} icon={<TrendingUp size={20} className="text-orange-400" />} label="Avg. Similarity" value={`${stats?.averageScore ?? 0}%`} color="bg-orange-500/20" />
          <StatCard delay={0.2} icon={<Clock size={20} className="text-purple-400" />} label="Processing" value={processingCount} color="bg-purple-500/20" />
        </div>

        {/* Documents List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <GlassCard className="overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-semibold text-white">Recent Scans</h2>
              <span className="text-xs text-slate-500">{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
            </div>

            {docs.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-4">
                  <FileText size={28} className="text-slate-600" />
                </div>
                <p className="text-slate-400 font-medium">No documents scanned yet</p>
                <p className="text-slate-600 text-sm mt-1">Upload a file to start AI-powered analysis</p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-sm hover:bg-indigo-600/30 transition-all"
                >
                  Upload your first document
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {docs.map((doc, i) => (
                  <motion.div
                    key={doc._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => doc.status === 'completed' && navigate(`/results/${doc._id}`)}
                    className={`flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors group ${doc.status === 'completed' ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-slate-700 transition-colors">
                        <FileText size={16} className="text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{doc.originalName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {doc.status === 'processing' ? (
                        <AIProcessingBadge />
                      ) : doc.status === 'failed' ? (
                        <div className="flex items-center gap-1.5 text-red-400 text-xs">
                          <AlertCircle size={13} />
                          <span>Failed</span>
                        </div>
                      ) : (
                        <>
                          <span className={statusBadge(doc.status)}>{doc.status}</span>
                          <ScoreMini score={doc.overallScore} />
                        </>
                      )}
                      <button
                        onClick={e => handleDelete(doc._id, e)}
                        className="text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={15} />
                      </button>
                      {doc.status === 'completed' && (
                        <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
