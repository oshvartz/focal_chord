
const fs = require('fs');

// ── Beat-synced chord generator for "Let It Be" ──────────────────────
//
// Uses actual beat positions detected by librosa from the audio.mp3,
// combined with the chord progression from the original chord chart.
//
// Beat data from: scratch/beat_analysis.json
// Chord patterns from: user-provided chord chart images

// ── Load beat analysis data ───────────────────────────────────────────

const beatData = JSON.parse(
  fs.readFileSync('C:/git/focal_chord/scratch/beat_analysis.json', 'utf8')
);

const beats = beatData.quarter_beat_times;     // 276 quarter-note beats
const bars  = beatData.bar_times;              // 69 bar downbeats

console.log(`Loaded ${beats.length} quarter-note beats, ${bars.length} bars`);
console.log(`Tempo: ~${beatData.tempo_bpm} BPM`);
console.log(`Duration: ${beatData.duration}s`);

// ── Chord pattern definitions ─────────────────────────────────────────
//
// From the chord chart images:
//
// Intro:  C G Am F F6 C G F C
//
// Verse:
//   C              G
//   When I find myself / in times of trouble
//   Am          F           F6
//   Mother Mary comes to me
//   C                G
//   Speaking words of wisdom
//   F    C
//   let it be
//
// Chorus (same as second half of verse but starts Am):
//   Am          G           F6
//   Let it be, let it be
//   C                G
//   Let it be, let it be
//   F    C
//   Whisper words of wisdom, let it be
//
// Each chord gets 1 bar (4 beats) unless otherwise specified.
// F→F6 and F→C are half-bar transitions (2 beats each).

// Pattern: [chord, beats]
// Intro: 8 bars = 32 beats
const INTRO = [
  ['C', 4], ['G', 4], ['Am', 4], ['F', 2], ['F6', 2],
  ['C', 4], ['G', 4], ['F', 4], ['C', 4],
];

// Verse half: 8 bars = 32 beats  (one iteration of the verse pattern)
const VERSE_HALF = [
  ['C', 4], ['G', 4], ['Am', 4], ['F', 2], ['F6', 2],
  ['C', 4], ['G', 4], ['F', 4], ['C', 4],
];

// Chorus half: 8 bars = 32 beats
// Starts on Am instead of C, but same harmonic rhythm
const CHORUS_HALF = [
  ['Am', 4], ['G', 4], ['F', 4], ['C', 4],
  ['C', 4], ['G', 4], ['F', 4], ['C', 4],
];

// Outro / turnaround: 5 bars = 20 beats (remaining after 8 × 32-beat sections)
const OUTRO = [
  ['F', 2], ['C', 2], ['F6', 2], ['C', 6],
  ['F', 2], ['C', 2], ['F6', 2], ['C', 2],
];

// ── Song structure (mapped to bar numbers from beat detection) ────────
//
// 69 bars detected. The 8-bar block boundaries are:
//   bar  1 (t=0.070)  → Intro
//   bar  9 (t=27.191) → Verse 1 (first half)
//   bar 17 (t=54.056) → Verse 1 (second half) / pre-chorus
//   bar 25 (t=80.643) → Chorus 1
//   bar 33 (t=107.462)→ Interlude / Solo
//   bar 41 (t=135.187)→ Solo continues / Verse 3
//   bar 49 (t=163.260)→ Chorus
//   bar 57 (t=191.077)→ Chorus repeat / Outro
//   bar 65 (t=218.918)→ Outro
//
// But looking at the actual song structure more carefully (using lyrics as guide):
// The song is in 4/4 time, and sections are 8 bars each.
//
// Bars  1-8:  Intro (piano)
// Bars  9-16: Verse 1a ("When I find myself...")
// Bars 17-24: Verse 1b ("And in my hour of darkness...")
// Bars 25-28: Chorus ("Let it be, let it be...") - shortened
// Bars 29-32: Chorus continuation
// Bars 33-40: Verse 2a or Interlude
// Bars 41-48: Guitar Solo / Verse-like
// Bars 49-56: Verse 3 / Chorus
// Bars 57-64: Chorus repeat
// Bars 65-69: Outro

// ── Helper: map a chord pattern onto real beat positions ──────────────

function mapPatternToBeats(pattern, startBeatIndex) {
  const chords = [];
  let beatIdx = startBeatIndex;

  for (const [chord, numBeats] of pattern) {
    if (beatIdx >= beats.length) break;

    const startTime = beats[beatIdx];
    const endBeatIdx = Math.min(beatIdx + numBeats, beats.length);

    // End time: either the next beat's start, or estimate from last beat
    let endTime;
    if (endBeatIdx < beats.length) {
      endTime = beats[endBeatIdx];
    } else {
      // Extrapolate from last known beat
      const lastDiff = beats[beats.length - 1] - beats[beats.length - 2];
      endTime = beats[beats.length - 1] + lastDiff * (endBeatIdx - beats.length + 1);
    }

    chords.push({
      chord,
      start_time: Number(startTime.toFixed(3)),
      end_time: Number(endTime.toFixed(3)),
    });

    beatIdx += numBeats;
  }

  return { chords, nextBeatIndex: beatIdx };
}

// ── Generate all chords ───────────────────────────────────────────────

function generateChords() {
  const allChords = [];
  let beatIdx = 0;

  function addSection(name, pattern) {
    const result = mapPatternToBeats(pattern, beatIdx);
    console.log(`  ${name}: beats ${beatIdx}-${result.nextBeatIndex} (t=${beats[beatIdx]?.toFixed(3)}s - ${beats[result.nextBeatIndex]?.toFixed(3) || 'end'}s)`);
    allChords.push(...result.chords);
    beatIdx = result.nextBeatIndex;
  }

  // Structure based on beat analysis (69 bars = 276 beats):
  //
  // The chord chart shows the verse pattern repeats.
  // Each verse/chorus uses the same 8-bar (32-beat) harmonic pattern.

  addSection('Intro',        INTRO);           // bars 1-8:   32 beats
  addSection('Verse 1a',     VERSE_HALF);      // bars 9-16:  32 beats
  addSection('Verse 1b',     VERSE_HALF);      // bars 17-24: 32 beats
  addSection('Chorus 1',     CHORUS_HALF);     // bars 25-32: 32 beats
  addSection('Interlude',    VERSE_HALF);      // bars 33-40: 32 beats
  addSection('Solo/Verse',   VERSE_HALF);      // bars 41-48: 32 beats
  addSection('Chorus 2',     CHORUS_HALF);     // bars 49-56: 32 beats
  addSection('Chorus 3',     CHORUS_HALF);     // bars 57-64: 32 beats
  addSection('Outro',        OUTRO);           // bars 65-69: remaining

  return allChords;
}

// ── Merge consecutive duplicate chords ────────────────────────────────

function mergeConsecutive(chords) {
  if (chords.length === 0) return chords;
  const merged = [{ ...chords[0] }];
  for (let i = 1; i < chords.length; i++) {
    const prev = merged[merged.length - 1];
    if (chords[i].chord === prev.chord) {
      prev.end_time = chords[i].end_time;
    } else {
      merged.push({ ...chords[i] });
    }
  }
  return merged;
}

// ── Write to chords.json ──────────────────────────────────────────────

const dataPath = 'C:/git/focal_chord/public/library/let-it-be/chords.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('Generating chords from detected beats...\n');
const raw = generateChords();
data.chords = mergeConsecutive(raw);

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

console.log(`\nGenerated ${raw.length} chord entries.`);
console.log(`After merging consecutive duplicates: ${data.chords.length} entries.`);
console.log(`Saved to ${dataPath}`);
