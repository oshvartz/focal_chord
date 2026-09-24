import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function SongSelector({ onSelect, currentSongId }) {
  const [catalog, setCatalog] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch('/library/catalog.json')
      .then((r) => r.json())
      .then(setCatalog)
      .catch(console.error);
  }, []);

  const selected = catalog.find((s) => s.id === currentSongId);

  if (catalog.length === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-text-muted text-sm">Loading library...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-light border border-white/10
                   hover:border-neon-cyan/40 transition-colors text-left w-full max-w-xs mx-auto"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm md:text-base font-semibold truncate">
            {selected ? selected.title : 'Select a song'}
          </p>
          {selected && (
            <p className="text-xs text-text-muted truncate">{selected.artist}</p>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-full max-w-xs
                        bg-surface-light border border-white/10 rounded-lg shadow-xl z-50
                        max-h-64 overflow-y-auto">
          {catalog.map((song) => (
            <button
              key={song.id}
              onClick={() => {
                onSelect(song);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-3 hover:bg-surface-lighter transition-colors
                         border-b border-white/5 last:border-b-0
                         ${song.id === currentSongId ? 'text-neon-cyan' : 'text-white'}`}
            >
              <p className="text-sm font-medium truncate">{song.title}</p>
              <p className="text-xs text-text-muted truncate">{song.artist}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
