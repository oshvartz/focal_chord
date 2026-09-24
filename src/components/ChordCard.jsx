import { motion } from 'framer-motion';
import ChordDiagram from './ChordDiagram';

export default function ChordCard({ chord, isActive, isPast }) {
  return (
    <motion.div
      className={`flex-shrink-0 flex flex-col items-center justify-center
                  w-28 h-36 md:w-36 md:h-44 mx-2 md:mx-3 rounded-2xl
                  transition-colors duration-300
                  ${
                    isActive
                      ? 'glow-box bg-surface-light'
                      : isPast
                        ? 'bg-surface-light/30 border border-white/5'
                        : 'bg-surface-light border border-white/10'
                  }`}
      animate={{
        scale: isActive ? 1.15 : isPast ? 0.85 : 0.95,
        opacity: isActive ? 1 : isPast ? 0.3 : 0.6,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <span
        className={`text-xl md:text-2xl font-bold mb-1
                    ${isActive ? 'text-neon-cyan glow-text' : 'text-white/70'}`}
      >
        {chord}
      </span>
      {isActive && <ChordDiagram chordName={chord} lite />}
    </motion.div>
  );
}
