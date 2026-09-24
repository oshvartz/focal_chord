import { useRef, useCallback, useState } from 'react';
import { useMotionValueEvent } from 'framer-motion';
import { Play, Pause, RotateCcw } from 'lucide-react';

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function ControlDeck({ isPlaying, play, pause, restart, seek, currentTime, duration }) {
  const scrubberRef = useRef(null);
  const [displayTime, setDisplayTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const isScrubbing = useRef(false);

  useMotionValueEvent(currentTime, 'change', (t) => {
    if (!isScrubbing.current) {
      setDisplayTime(t);
      if (scrubberRef.current) {
        scrubberRef.current.value = t;
        const pct = totalDuration > 0 ? (t / totalDuration) * 100 : 0;
        scrubberRef.current.style.setProperty('--progress', `${pct}%`);
      }
    }
  });

  useMotionValueEvent(duration, 'change', (d) => {
    setTotalDuration(d);
    if (scrubberRef.current) {
      scrubberRef.current.max = d;
    }
  });

  const handleScrubStart = useCallback(() => {
    isScrubbing.current = true;
  }, []);

  const handleScrub = useCallback((e) => {
    const t = parseFloat(e.target.value);
    setDisplayTime(t);
    const pct = totalDuration > 0 ? (t / totalDuration) * 100 : 0;
    e.target.style.setProperty('--progress', `${pct}%`);
  }, [totalDuration]);

  const handleScrubEnd = useCallback((e) => {
    const t = parseFloat(e.target.value);
    seek(t);
    isScrubbing.current = false;
  }, [seek]);

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-md border-t border-white/10">
      <div className="max-w-3xl mx-auto px-4 py-3 md:py-4">
        {/* Scrubber */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs md:text-sm font-mono text-text-muted w-10 text-right">
            {formatTime(displayTime)}
          </span>
          <input
            ref={scrubberRef}
            type="range"
            min={0}
            max={totalDuration || 100}
            step={0.1}
            defaultValue={0}
            onPointerDown={handleScrubStart}
            onTouchStart={handleScrubStart}
            onInput={handleScrub}
            onChange={handleScrubEnd}
            className="flex-1"
          />
          <span className="text-xs md:text-sm font-mono text-text-muted w-10">
            {formatTime(totalDuration)}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={restart}
            className="p-2 rounded-full text-text-muted hover:text-white transition-colors"
            aria-label="Restart"
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={isPlaying ? pause : play}
            className="p-3 md:p-4 rounded-full bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
          </button>
          {/* Spacer to balance the layout */}
          <div className="w-9" />
        </div>
      </div>
    </div>
  );
}
