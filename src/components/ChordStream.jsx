import { useRef, useEffect, useState } from 'react';
import { motion, useTransform } from 'framer-motion';
import ChordCard from './ChordCard';
import TargetBox from './TargetBox';

export default function ChordStream({ chords, currentTime, activeIndex, songDuration }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  // Card width (including margin) — keep in sync with ChordCard sizing
  const cardWidth = typeof window !== 'undefined' && window.innerWidth < 768 ? 128 : 168;

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Build time breakpoints from chord start_times
  const times = chords.map((c) => c.start_time);
  // Each chord index maps to an x offset that centers that card
  const centerOffset = containerWidth / 2 - cardWidth / 2;
  const positions = chords.map((_, i) => centerOffset - i * cardWidth);

  // Map currentTime -> x translation of the track
  const x = useTransform(currentTime, times.length > 0 ? times : [0], positions.length > 0 ? positions : [0]);

  if (!chords || chords.length === 0) {
    return (
      <div className="relative h-40 md:h-52 flex items-center justify-center">
        <p className="text-text-muted">No chord data</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-40 md:h-52 overflow-hidden">
      <TargetBox />
      <motion.div className="absolute top-0 h-full flex items-center" style={{ x }}>
        {chords.map((c, i) => (
          <ChordCard
            key={`${c.chord}-${c.start_time}`}
            chord={c.chord}
            isActive={i === activeIndex}
            isPast={i < activeIndex}
          />
        ))}
      </motion.div>
    </div>
  );
}
