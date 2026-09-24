# 🎸 FocalChord

**Fixed-focus chord & lyric visualizer synced to audio playback.**

FocalChord anchors the active chord in a stationary focal point and moves the timeline around it — so you never lose your place when glancing at the fretboard.

![React](https://img.shields.io/badge/React-19-blue)
![Framer Motion](https://img.shields.io/badge/Framer%20Motion-13-purple)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-cyan)

## How It Works

- **Horizontal Chord Stream** — Chords slide in from the right and lock into a glowing center "Target Box" when their timestamp matches the audio. Past chords fade left.
- **SVG Fretboard Diagrams** — The active chord shows a real fingering diagram so you know exactly where to put your fingers.
- **3-Line Lyric Window** — Previous, current (highlighted), and next lyric lines with smooth vertical transitions.
- **60fps Animation** — Driven by `requestAnimationFrame` polling the native `<audio>` element's clock, mapped through Framer Motion `MotionValue` + `useTransform`. Zero React re-renders for the slide animation.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and select a song from the dropdown.

## Adding Songs

1. Create a folder in `public/library/<song-id>/`
2. Add your `audio.mp3` and a `chords.json` file:

```json
{
  "metadata": {
    "title": "Song Title",
    "artist": "Artist Name",
    "duration": 240.0,
    "audio_source": "audio.mp3"
  },
  "chords": [
    { "chord": "Am", "start_time": 0.0, "end_time": 3.5 },
    { "chord": "F",  "start_time": 3.5, "end_time": 7.0 }
  ],
  "lyrics": [
    { "text": "First line of lyrics", "start_time": 10.0, "end_time": 13.5 }
  ]
}
```

3. Register the song in `public/library/catalog.json`:

```json
[
  {
    "id": "song-id",
    "title": "Song Title",
    "artist": "Artist Name",
    "folder_path": "/library/song-id/"
  }
]
```

## Supported Chords

The built-in voicing database (`src/data/chordVoicings.js`) includes:

**Major:** C, D, E, F, G, A, B
**Minor:** Am, Bm, Cm, Dm, Em, Fm, Gm
**Seventh:** A7, B7, C7, D7, E7, F#7, G7
**Sus:** Asus2, Asus4, Dsus2, Dsus4, Esus4

Add more voicings by editing `chordVoicings.js` — each entry needs `frets`, `fingers`, `barres`, and `capo` fields.

## Tech Stack

| Layer | Tech |
|-------|------|
| Build | Vite 6 |
| UI | React 19 |
| Animation | Framer Motion 13 |
| Styling | Tailwind CSS 4 |
| Chord SVGs | @tombatossals/react-chords |
| Icons | Lucide React |
| Audio | Native HTML5 `<audio>` |

## License

MIT
