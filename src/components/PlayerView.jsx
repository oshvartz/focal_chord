import ChordStream from './ChordStream';
import LyricAnchor from './LyricAnchor';
import ControlDeck from './ControlDeck';
import ChordDiagram from './ChordDiagram';
import { useChordIndex } from '../hooks/useChordIndex';
import { useLyricIndex } from '../hooks/useLyricIndex';

export default function PlayerView({ songData, audioEngine }) {
  const { currentTime, duration, isPlaying, play, pause, restart, seek } = audioEngine;
  const { chords = [], lyrics = [], metadata = {} } = songData || {};

  const { activeIndex: activeChordIndex } = useChordIndex(chords, currentTime);
  const { activeIndex: activeLyricIndex } = useLyricIndex(lyrics, currentTime);

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
          currentTime={currentTime}
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
      />
    </div>
  );
}
