import { useMemo, useState, useEffect } from 'react';
import { useTransform } from 'framer-motion';
import ChordStream from './ChordStream';
import LyricAnchor from './LyricAnchor';
import ControlDeck from './ControlDeck';
import ChordDiagram from './ChordDiagram';
import { useChordIndex } from '../hooks/useChordIndex';
import { useLyricIndex } from '../hooks/useLyricIndex';

export default function PlayerView({ songData, audioEngine, songId }) {
  const { currentTime, duration, isPlaying, volume, setVolume, play, pause, restart, seek } = audioEngine;
  const { chords: rawChords = [], lyrics = [], metadata = {} } = songData || {};

  const chords = useMemo(() => rawChords, [rawChords]);

  // Lyric sync offset state
  const [lyricOffset, setLyricOffset] = useState(metadata.lyricOffset !== undefined ? metadata.lyricOffset : 1.0);

  useEffect(() => {
    if (metadata.lyricOffset !== undefined) {
      setLyricOffset(metadata.lyricOffset);
    } else {
      setLyricOffset(1.0);
    }
  }, [metadata.lyricOffset, songId]);

  // By adding offset to currentTime, we make the lyric engine think we are further
  // ahead in time, which causes lyrics to appear earlier on screen.
  // We apply this to both lyrics and chords so they stay in perfect sync!
  const adjustedTime = useTransform(currentTime, t => Math.max(0, t + lyricOffset));

  const { activeIndex: activeChordIndex } = useChordIndex(chords, adjustedTime);
  const { activeIndex: activeLyricIndex } = useLyricIndex(lyrics, adjustedTime);

  const activeChordName = activeChordIndex >= 0 ? chords[activeChordIndex].chord : null;

  return (
    <div className="flex flex-col h-full">
      {/* Song info */}
      <div className="text-center pt-2 pb-1">
        <h2 className="text-base md:text-lg font-semibold truncate px-4">{metadata.title}</h2>
        <p className="text-xs md:text-sm text-text-muted">{metadata.artist}</p>
      </div>

      {/* Chord stream */}
      <div className="flex-shrink-0">
        <ChordStream
          chords={chords}
          currentTime={adjustedTime}
          activeIndex={activeChordIndex}
          songDuration={metadata.duration || 0}
        />
      </div>

      {/* Active chord diagram (large, centered) */}
      <div className="flex justify-center py-2 md:py-4">
        {activeChordName ? (
          <div className="flex flex-col items-center">
            <ChordDiagram chordName={activeChordName} />
          </div>
        ) : (
          <div className="w-24 h-24 md:w-28 md:h-28" />
        )}
      </div>

      {/* Lyrics */}
      <div className="flex-1 flex items-start justify-center">
        <LyricAnchor lyrics={lyrics} activeIndex={activeLyricIndex} />
      </div>

      {/* Controls — fixed at bottom, add padding so content isn't hidden */}
      <div className="h-28 md:h-32 flex-shrink-0" />
      <ControlDeck
        isPlaying={isPlaying}
        play={play}
        pause={pause}
        restart={restart}
        seek={seek}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        setVolume={setVolume}
        lyricOffset={lyricOffset}
        setLyricOffset={setLyricOffset}
        songId={songId}
      />
    </div>
  );
}
