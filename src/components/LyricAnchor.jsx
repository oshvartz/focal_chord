import { AnimatePresence, motion } from 'framer-motion';

export default function LyricAnchor({ lyrics, activeIndex }) {
  if (!lyrics || lyrics.length === 0) {
    return <div className="h-28 md:h-32" />;
  }

  const prev = activeIndex > 0 ? lyrics[activeIndex - 1]?.text : '';
  const current = activeIndex >= 0 ? lyrics[activeIndex]?.text : '';
  const next = activeIndex >= 0 && activeIndex < lyrics.length - 1 ? lyrics[activeIndex + 1]?.text : '';

  return (
    <div className="h-28 md:h-32 flex flex-col items-center justify-center overflow-hidden px-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-1 md:gap-2 text-center"
        >
          <p className="text-sm md:text-base text-text-dim leading-relaxed truncate max-w-[90vw]">
            {prev}
          </p>
          <p className="text-lg md:text-2xl font-semibold text-white leading-relaxed glow-text truncate max-w-[90vw]">
            {current || <span className="text-text-muted italic">♪ ♪ ♪</span>}
          </p>
          <p className="text-sm md:text-base text-text-dim leading-relaxed truncate max-w-[90vw]">
            {next}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
