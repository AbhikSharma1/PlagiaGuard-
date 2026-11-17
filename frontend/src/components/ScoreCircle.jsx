import { motion } from 'framer-motion';

const SIZE = 140;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

function getColor(score) {
  if (score >= 70) return '#ef4444';
  if (score >= 40) return '#f97316';
  return '#22c55e';
}

export default function ScoreCircle({ score = 0 }) {
  const offset = CIRC - (score / 100) * CIRC;
  const color = getColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#1e293b" strokeWidth={STROKE} />
        <motion.circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none" stroke={color} strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: CIRC }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center" style={{ marginTop: -SIZE / 2 - 18 }}>
        <span className="text-3xl font-bold" style={{ color }}>{score}%</span>
        <span className="text-xs text-slate-400">similarity</span>
      </div>
    </div>
  );
}
