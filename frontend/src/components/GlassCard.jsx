import { motion } from 'framer-motion';

export default function GlassCard({ children, className = '', ...props }) {
  return (
    <motion.div
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
