# Let It Be Chord Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Let It Be song data with the user-supplied chord chart and lyric text, using the existing MP3 beat grid for timestamps.

**Architecture:** The implementation changes song data only. A Node test loads `chords.json` and checks the entire chart sequence, lyric rows, timing boundaries, audio duration, and the intentional instrumental gap. The updated JSON maps the supplied verse and chorus patterns to the existing detected 16-beat section boundaries; it contains no invented instrumental chords and no trailing 24-chord reference block.

**Tech Stack:** JSON song data, Node.js built-in test runner and assertions, existing `scratch/beat_analysis.json` timing analysis, Vite production build.

---

## File structure

- `public/library/let-it-be/chords.json` — the shipped chart, lyric text, and absolute MP3 timestamps.
- `test/let-it-be-song-data.test.mjs` — a dependency-free regression test for this published song-data file.
- `let-it-be-chord-sync-design.md` — the approved design; update only the confirmed omission decisions.

### Task 1: Add a failing Let It Be song-data regression test

**Files:**

- Create: `test/let-it-be-song-data.test.mjs`
- Test: `test/let-it-be-song-data.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `test/let-it-be-song-data.test.mjs` with this complete test. It deliberately fails against the current data because the current sequence contains `Am7`, `Fmaj7`, and `F6`, does not include the printed `Dm` turnarounds, exceeds the MP3 duration, and has the final lyric pair in the wrong order.

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const data = JSON.parse(
  await readFile(new URL('../public/library/let-it-be/chords.json', import.meta.url), 'utf8'),
);

const verse = ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C', 'Dm', 'C'];
const chorus = ['C', 'Am', 'G', 'F', 'C', 'C', 'G', 'F', 'C', 'Dm', 'C'];
const expectedChords = [
  ...verse, ...verse, ...verse, ...chorus, ...verse, ...verse, ...chorus,
  ...chorus, ...chorus, ...verse, ...verse, ...chorus, ...chorus,
];

const lyricRows = [
  ['When I find myself in times of trouble, Mother Mary comes to me', 13.328, 20.526],
  ['Speaking words of wisdom, let it be', 20.526, 27.191],
  ['And in my hour of darkness, she is standing right in front of me', 27.191, 33.692],
  ['Speaking words of wisdom, let it be', 33.692, 40.519],
  ['Let it be, let it be, let it be, let it be', 40.519, 47.206],
  ['Whisper words of wisdom, let it be', 47.206, 54.056],
  ['And when the broken hearted people, living in the world agree', 54.056, 60.511],
  ['There will be an answer, let it be', 60.511, 67.129],
  ['But though they may be parted, there is still a chance that they may see', 67.129, 73.863],
  ['There will be an answer, let it be', 73.863, 80.643],
  ['Let it be, let it be, let it be, let it be', 80.643, 87.353],
  ['There will be an answer, let it be', 87.353, 94.018],
  ['Let it be, let it be, let it be, let it be', 94.018, 100.682],
  ['Whisper words of wisdom, let it be', 100.682, 107.462],
  ['Let it be, let it be, let it be, let it be', 163.260, 170.249],
  ['Whisper words of wisdom, let it be', 170.249, 177.238],
  ['And when the night is cloudy, there is still a light that shines on me', 177.238, 184.157],
  ['Shine on till tomorrow, let it be', 184.157, 191.077],
  ['I wake up to the sound of music, Mother Mary comes to me', 191.077, 198.066],
  ['Speaking words of wisdom, let it be', 198.066, 204.986],
  ['Let it be, let it be, let it be, let it be', 204.986, 211.998],
  ['There will be an answer, let it be', 211.998, 218.918],
  ['Let it be, let it be, let it be, let it be', 218.918, 225.884],
  ['Whisper words of wisdom, let it be', 225.884, 233.105],
];

test('Let It Be matches the supplied chart and MP3 timeline', () => {
  assert.equal(data.metadata.duration, 243.027);
  assert.equal(data.metadata.audio_source, 'audio.mp3');
  assert.deepEqual(data.chords.map(({ chord }) => chord), expectedChords);
  assert.deepEqual(
    data.lyrics.map(({ text, start_time, end_time }) => [text, start_time, end_time]),
    lyricRows,
  );

  for (const entry of [...data.chords, ...data.lyrics]) {
    assert.ok(entry.start_time >= 0);
    assert.ok(entry.end_time > entry.start_time);
    assert.ok(entry.end_time <= data.metadata.duration);
  }

  for (let index = 1; index < data.chords.length; index += 1) {
    assert.ok(data.chords[index].start_time >= data.chords[index - 1].end_time);
  }

  assert.ok(data.chords.every(
    ({ end_time, start_time }) => end_time <= 107.462 || start_time >= 163.260,
  ));
  assert.equal(data.chords.at(-1).end_time, data.metadata.duration);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
node --test test/let-it-be-song-data.test.mjs
```

Expected: `FAIL` because the current JSON still has substitute chords, final timestamps after 243.027 seconds, and the final lyric rows do not match the supplied text.

- [ ] **Step 3: Commit the test**

```powershell
git add test/let-it-be-song-data.test.mjs
git commit -m "test: specify Let It Be chart data"
```

### Task 2: Replace the chart and lyric data

**Files:**

- Modify: `public/library/let-it-be/chords.json`
- Test: `test/let-it-be-song-data.test.mjs`

- [ ] **Step 1: Build the chord rows from the existing audio beat grid**

Use `scratch/beat_analysis.json` only as the local timing input. Its `quarter_beat_times` list provides the detected start time of each beat. Use this exact chart pattern and section schedule; `null` deliberately produces no rows for the chart-free instrumental break.

```js
const verse = [
  ['C', 2], ['G', 2], ['Am', 2], ['F', 2],
  ['C', 2], ['G', 2], ['F', 1], ['C', 1], ['Dm', 1], ['C', 1],
];
const chorus = [
  ['C', 2], ['Am', 2], ['G', 2], ['F', 1], ['C', 1],
  ['C', 2], ['G', 2], ['F', 1], ['C', 1], ['Dm', 1], ['C', 1],
];
const sections = [
  [0, verse], [16, verse], [32, verse], [48, chorus],
  [64, verse], [80, verse], [96, chorus], [112, chorus],
  [128, null], [144, null], [160, null], [176, null],
  [192, chorus], [208, verse], [224, verse], [240, chorus], [256, chorus],
];

function buildChords(beatTimes) {
  return sections.flatMap(([startBeat, pattern]) => {
    if (pattern === null) return [];
    let beat = startBeat;
    return pattern.map(([chord, beats]) => {
      const row = {
        chord,
        start_time: Number(beatTimes[beat].toFixed(3)),
        end_time: Number(beatTimes[beat + beats].toFixed(3)),
      };
      beat += beats;
      return row;
    });
  });
}
```

The `sections` definition yields 136 rows. After building it, set the final `C` row’s `end_time` to `243.027` so it sustains through the MP3 coda without adding a chord from the omitted trailing reference block.

- [ ] **Step 2: Write the replacement JSON data**

Set `metadata.duration` to `243.027`, replace `chords` with `buildChords(beatTimes)`, and replace `lyrics` with the 24 `{ text, start_time, end_time }` rows from the `lyricRows` constant in Task 1. Preserve the existing title, artist, and `audio_source` values. Do not modify the React components or chord-voicing database.

- [ ] **Step 3: Run the regression test to verify it passes**

Run:

```powershell
node --test test/let-it-be-song-data.test.mjs
```

Expected: `PASS` with one passing test.

- [ ] **Step 4: Verify the JSON and production build**

Run:

```powershell
node -e "JSON.parse(require('node:fs').readFileSync('public/library/let-it-be/chords.json', 'utf8')); console.log('valid JSON')"
npm run build
```

Expected: `valid JSON`, followed by a successful Vite build.

- [ ] **Step 5: Commit the song data**

```powershell
git add public/library/let-it-be/chords.json
git commit -m "fix: sync Let It Be chart data"
```

## Plan self-review

- Spec coverage: Task 2 uses the supplied chart labels, preserves the user-supplied lyrics, leaves the instrumental break without lyric or chord rows, omits the trailing reference block, and uses the MP3’s existing beat analysis. Task 1 verifies each condition and timestamp range.
- Placeholder scan: the plan contains exact file paths, exact patterns, exact lyric rows, commands, and expected outcomes.
- Type consistency: JSON rows use the existing `chord`, `text`, `start_time`, and `end_time` field names; all test assertions use those same field names.
