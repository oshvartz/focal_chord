import { useState, useCallback } from 'react';
import SongSelector from './components/SongSelector';
import PlayerView from './components/PlayerView';
import { useAudioEngine } from './hooks/useAudioEngine';

export default function App() {
  const [songData, setSongData] = useState(null);
  const [currentSongId, setCurrentSongId] = useState(null);
  const audioEngine = useAudioEngine();

  const handleSelectSong = useCallback(async (song) => {
    try {
      const res = await fetch(`${song.folder_path}chords.json`);
      const data = await res.json();
      setSongData(data);
      setCurrentSongId(song.id);
      audioEngine.loadAudio(`${song.folder_path}${data.metadata.audio_source}`);
    } catch (err) {
      console.error('Failed to load song:', err);
    }
  }, [audioEngine]);

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Hidden audio element */}
      <audio ref={audioEngine.audioRef} preload="auto" />

      {/* Header with song selector */}
      <header className="flex-shrink-0 px-4 py-3 md:py-4 border-b border-white/5">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-bold text-neon-cyan glow-text tracking-tight">
              FocalChord
            </h1>
            <SongSelector onSelect={handleSelectSong} currentSongId={currentSongId} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {songData ? (
          <PlayerView songData={songData} audioEngine={audioEngine} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 px-4">
            <div className="text-6xl">🎸</div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Welcome to FocalChord</h2>
            <p className="text-text-muted text-center max-w-md">
              Select a song from the dropdown above to start playing along.
              Chords and lyrics will sync to the audio in real time.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
