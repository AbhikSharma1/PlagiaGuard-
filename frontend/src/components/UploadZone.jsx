import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, X, Cpu, Zap } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const SCAN_STEPS = [
  'Extracting text...',
  'Splitting into sentences...',
  'Generating AI embeddings...',
  'Computing semantic similarity...',
  'Categorizing matches...',
];

function ScanningAnimation() {
  const [stepIdx, setStepIdx] = useState(0);

  // Cycle through steps
  useState(() => {
    const interval = setInterval(() => {
      setStepIdx(i => (i + 1) % SCAN_STEPS.length);
    }, 1200);
    return () => clearInterval(interval);
  });

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      {/* Radar animation */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-indigo-500/40"
            animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.65, ease: 'easeOut' }}
            style={{ width: 40, height: 40 }}
          />
        ))}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent"
        />
        <Cpu size={16} className="absolute text-indigo-400" />
      </div>

      {/* Step indicator */}
      <div className="text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={stepIdx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-indigo-300 font-medium"
          >
            {SCAN_STEPS[stepIdx]}
          </motion.p>
        </AnimatePresence>
        <p className="text-xs text-slate-500 mt-1">Gemini AI is analyzing your document</p>
      </div>

      {/* Progress bar */}
      <div className="w-48 h-1 rounded-full bg-slate-800 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}

export default function UploadZone({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(accepted => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: uploading,
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/documents/upload', form);
      toast.success('AI analysis started!');
      setFile(null);
      onUploaded?.(data.documentId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
      setUploading(false);
    }
  };

  if (uploading) return <ScanningAnimation />;

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300
          ${isDragActive
            ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
            : 'border-slate-600 hover:border-indigo-500 hover:bg-indigo-500/5'
          }`}
      >
        <input {...getInputProps()} />
        <motion.div animate={{ y: isDragActive ? -8 : 0 }} transition={{ type: 'spring', stiffness: 300 }}>
          <div className="relative inline-block mb-3">
            <UploadCloud className="text-indigo-400" size={44} />
            {isDragActive && (
              <motion.div
                className="absolute -inset-2 rounded-full border-2 border-indigo-400/50"
                animate={{ scale: [1, 1.3], opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </div>
          <p className="text-slate-300 font-medium">
            {isDragActive ? 'Drop to analyze!' : 'Drag & drop your document'}
          </p>
          <p className="text-slate-500 text-sm mt-1">Supports .txt, .pdf, .docx — max 10MB</p>
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <Zap size={11} className="text-indigo-400" />
            <span className="text-xs text-indigo-400/70">Powered by Gemini Semantic Embeddings</span>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between bg-slate-800/60 rounded-xl px-4 py-3 border border-slate-700"
          >
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-indigo-400" />
              <span className="text-sm text-slate-300 truncate max-w-xs">{file.name}</span>
              <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
            <button onClick={() => setFile(null)} className="text-slate-500 hover:text-red-400 transition-colors">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {file && (
        <motion.button
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          onClick={handleUpload}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          <Cpu size={16} />
          Analyze with AI
        </motion.button>
      )}
    </div>
  );
}
