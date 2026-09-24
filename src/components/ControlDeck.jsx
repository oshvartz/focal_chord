import { useRef, useCallback, useState } from 'react';
import { useMotionValueEvent } from 'framer-motion';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function ControlDeck({ isPlaying, play, pause, restart, seek, currentTime, duration, volume, setVolume }) {
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

        {/* Buttons Row */}
        <div className="flex items-center justify-between">
          {/* Left: Restart */}
          <div className="flex items-center w-24 md:w-32">
            <button
              onClick={restart}
              className="p-2 rounded-full text-text-muted hover:text-white transition-colors"
              aria-label="Restart"
            >
              <RotateCcw size={20} />
            </button>
          </div>

          {/* Center: Play/Pause */}
          <button
            onClick={isPlaying ? pause : play}
            className="p-3 md:p-4 rounded-full bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
          </button>

          {/* Right: Volume */}
          <div className="flex items-center justify-end gap-2 w-24 md:w-32">
            <button
              onClick={() => setVolume(volume === 0 ? 1 : 0)}
              className="text-text-muted hover:text-white transition-colors"
              aria-label={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={{ '--progress': `${volume * 100}%` }}
              className="w-16 hidden md:block"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
