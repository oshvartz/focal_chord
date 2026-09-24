# FocalChord — Agent Memory

## Environment
- **OS:** Windows (PowerShell terminal)
- **Runtime:** Node.js, npm
- **Dev server:** `npm run dev` → http://localhost:5173/

## Tech Stack
- **Framework:** React 19 + Vite 6
- **Animation:** Framer Motion 13 (`MotionValue` + `useTransform`, NOT useState loops)
- **Styling:** Tailwind CSS 4 (via `@tailwindcss/vite` plugin, no config file — uses `@theme` in CSS)
- **Chord SVGs:** `@tombatossals/react-chords` + local voicing database (`src/data/chordVoicings.js`)
- **Icons:** Lucide React

## Architecture — Key Decisions
- **Audio clock drives everything.** A single `requestAnimationFrame` loop in `useAudioEngine` polls `audio.currentTime` and writes to a `MotionValue`. No `setInterval`, no `setTimeout`, no `useEffect` polling.
- **Zero re-render animation.** The chord stream's horizontal `x` translation is computed via `useTransform(currentTime → pixels)`. React never re-renders for the slide.
- **Binary search for seeking.** `useChordIndex` and `useLyricIndex` use binary search over `start_time` arrays to snap to the correct index on scrub/seek.
- **Minimal React state.** Only `isPlaying`, `selectedSong`, `currentSongId`, and active chord/lyric index use `useState`. Everything else is refs or MotionValues.

## Data Format
- Songs live in `public/library/<song-id>/` with `audio.mp3` + `chords.json`
- `public/library/catalog.json` is the song index (array of `{id, title, artist, folder_path}`)
- `chords.json` uses absolute timestamps in seconds (`start_time` / `end_time`), NOT relative beats

## File Structure
```
src/
├── App.jsx                      # Root: song selector + player routing
├── main.jsx                     # Entry point
├── index.css                    # Tailwind base + neon theme + glow utilities
├── data/
│   └── chordVoicings.js         # Chord name → fret/finger/barre mapping
├── hooks/
│   ├── useAudioEngine.js        # RAF loop, MotionValue, play/pause/seek
│   ├── useChordIndex.js         # Binary search chord pointer
│   └── useLyricIndex.js         # Binary search lyric pointer
└── components/
    ├── SongSelector.jsx         # Dropdown from catalog.json
    ├── PlayerView.jsx           # Main player layout
    ├── ChordStream.jsx          # Horizontal sliding chord track (useTransform)
    ├── ChordCard.jsx            # Individual chord chip with spring animation
    ├── ChordDiagram.jsx         # SVG fretboard via @tombatossals/react-chords
    ├── TargetBox.jsx            # Fixed center glow overlay
    ├── LyricAnchor.jsx          # 3-line lyric window with AnimatePresence
    └── ControlDeck.jsx          # Play/Pause, Restart, Scrubber
```

## Songs
| ID | Title | Artist | Status |
|----|-------|--------|--------|
| let-it-be | Let It Be | The Beatles | chords.json ✅, audio.mp3 pending |

## Style System
- Dark mode only. Background: `#0a0a0f` (surface)
- Accent: `#00f0ff` (neon-cyan) with glow via `.glow-box` and `.glow-text` CSS classes
- Mobile-responsive with `md:` breakpoints throughout
- Song selector is a dropdown (not grid/cards)
