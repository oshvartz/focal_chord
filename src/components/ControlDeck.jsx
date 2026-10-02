import { useRef, useCallback, useState } from 'react';
import { useMotionValueEvent } from 'framer-motion';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Save } from 'lucide-react';

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function ControlDeck({ 
  isPlaying, play, pause, restart, seek, currentTime, duration, volume, setVolume,
  lyricOffset, setLyricOffset, songId
}) {
  const scrubberRef = useRef(null);
  const [displayTime, setDisplayTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [saveStatus, setSaveStatus] = useState(null);
  const isScrubbing = useRef(false);

  const handleSaveOffset = async () => {
    if (!songId) return;
    try {
      setSaveStatus('saving');
      const res = await fetch('/api/save-offset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, offset: lyricOffset })
      });
      if (res.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 2000);
      }
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

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
          {/* Left: Restart & Sync */}
          <div className="flex items-center gap-2 md:gap-4 w-1/3">
            <button
              onClick={restart}
              className="p-2 rounded-full text-text-muted hover:text-white transition-colors"
              aria-label="Restart"
            >
              <RotateCcw size={20} />
            </button>

            {/* Lyric Sync Controls */}
            {setLyricOffset && (
              <div 
                className="flex flex-col items-center gap-1"
                title="Adjust Lyric Timing (+ makes lyrics appear earlier)"
              >
                <span className="text-[10px] text-text-muted/70 uppercase tracking-wider hidden md:block">Lyric Sync</span>
                <div className="flex items-center gap-1 text-xs text-text-muted bg-surface-light/50 px-2 py-1 rounded-md border border-white/5">
                  <button 
                    onClick={() => setLyricOffset(o => o - 0.2)} 
                    className="hover:text-white hover:bg-white/10 rounded px-1.5 py-0.5 transition-colors"
                    aria-label="Delay Lyrics"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-mono">
                    {lyricOffset > 0 ? '+' : ''}{lyricOffset.toFixed(1)}s
                  </span>
                  <button 
                    onClick={() => setLyricOffset(o => o + 0.2)} 
                    className="hover:text-white hover:bg-white/10 rounded px-1.5 py-0.5 transition-colors"
                    aria-label="Advance Lyrics"
                  >
                    +
                  </button>
                  <button
                    onClick={handleSaveOffset}
                    className={`ml-1 hover:text-white hover:bg-white/10 rounded p-1 transition-colors ${saveStatus === 'saved' ? 'text-green-400' : saveStatus === 'error' ? 'text-red-400' : ''}`}
                    title="Save Sync"
                  >
                    {saveStatus === 'saved' ? '✓' : <Save size={12} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Center: Play/Pause */}
          <div className="flex justify-center w-1/3">
            <button
              onClick={isPlaying ? pause : play}
              className="p-3 md:p-4 rounded-full bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
            </button>
          </div>

          {/* Right: Volume */}
          <div className="flex items-center justify-end gap-2 w-1/3">
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
