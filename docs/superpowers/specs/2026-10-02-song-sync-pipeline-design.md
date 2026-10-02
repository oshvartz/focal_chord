# Song Sync Pipeline — Design

**Date:** 2026-10-02
**Status:** Approved in brainstorming, pending spec review

## Goal

Automatically produce an accurately timed `chords.json` (chords + lyrics) for a song from its
`audio.mp3` and a chord/lyric sheet in **any** format. First target: Let It Be. The same
workflow must work unchanged for future songs added to `public/library/`.

## Problem with the current approach

The `scratch/` scripts beat-track the audio with librosa and lay a hard-coded verse/chorus
pattern over a fixed beat count. Tempo is fine, but any structural deviation — the break, the
guitar solo, the outro, a half bar — shifts every later section. Beat tracking can find beats
but cannot say which beat a section starts on.

**Key idea:** the vocals anchor the structure. Forced-aligning every sung word pins each
section in time, so an error cannot cascade past the next sung line.

## Requirements

- Fully automatic: no manual anchors or tapping per song.
- Inputs per song: `audio.mp3` + a sheet file in any format (Ultimate Guitar copy-paste,
  ChordPro, inline `[C]chords`, chords-over-lyrics plain text, `.txt`/`.md`/`.pro`).
- Output: `chords.json` in the existing format the player reads (`metadata`, `chords[]`,
  `lyrics[]` with `start_time`/`end_time`). The player is not changed.
- Runs locally on macOS (Apple Silicon/CPU). Heavy ML dependencies are acceptable.
- Sheet parsing is done by Claude inside a Claude Code session — no API key, no API calls
  from Python.

## Architecture

Two halves joined by one contract file:

```
Claude Code skill (/sync-song)            Python tool (tools/sync, uv)
──────────────────────────────            ─────────────────────────────
read sheet (any format)                   validate song.json
  → write song.json  ───── contract ────▶ separate → align lyrics → beats
fix song.json on validate errors          → align chords → emit
summarize report.json  ◀──────────────────  chords.json + report.json
```

### Files per song

```
public/library/<song>/
  audio.mp3        input
  sheet.*          input, any format (exactly one file matching sheet.*)
  chords.json      output
  truth.json       optional, hand-verified timestamps for acceptance testing
.sync-cache/<song>/  intermediate artifacts (gitignored)
  song.json        normalized sheet (written by Claude)
  vocals.wav, accompaniment.wav, words.json, beats.json, report.json
```

## Components

### 1. `.claude/skills/sync-song/SKILL.md`

Invoked as `/sync-song <song>`. Instructs Claude Code to:

1. Locate `public/library/<song>/audio.mp3` and exactly one `sheet.*`. Stop with a clear
   message if either is missing or the sheet is ambiguous.
2. Read the sheet and write `.sync-cache/<song>/song.json` per the schema below. Expand all
   shorthand into explicit playback order ("Chorus x2", "repeat verse chords", "(x3)").
   Chords attach to the word they sit above; instrumental passages become `bars`.
3. Run `uv run --project tools/sync sync validate <song>`. On failure, fix `song.json` from the
   reported errors and re-run. After 3 failed attempts, stop and show the errors to the user.
4. Run `uv run --project tools/sync sync align <song>`.
5. Read `report.json` and summarize low-confidence regions to the user. If a flag points to a
   sheet problem (missing line, wrong repeat count), correct `song.json` and re-run
   `align --from lyrics` (earlier stages are cached).

### 2. `song.json` contract

The only artifact the LLM produces. All sections in playback order, fully expanded.

```json
{
  "title": "Let It Be",
  "artist": "The Beatles",
  "sections": [
    { "type": "intro", "bars": [["C"], ["G"], ["Am"], ["F"]] },
    { "type": "verse", "lines": [
        { "text": "When I find myself in times of trouble",
          "chords": [{ "chord": "C", "word": 0 }, { "chord": "G", "word": 5 }] }
    ]},
    { "type": "solo", "bars": [["F"], ["C"], ["G"], ["F", "C"]] }
  ]
}
```

- `type`: one of `intro`, `verse`, `prechorus`, `chorus`, `bridge`, `solo`, `instrumental`,
  `outro`.
- A section has either `lines` (sung) or `bars` (instrumental), never both.
- `lines[].chords[].word`: 0-based index into `text.split()`; strictly non-decreasing within a
  line. Chords played between sung lines with no lyric under them (e.g. a turnaround) go in
  a separate `instrumental` section placed between the two lines' sections.
- `bars`: each bar is a list of 1–4 chords splitting the bar evenly.
- A JSON Schema file `tools/sync/schema/song.schema.json` is the source of truth; the skill
  references it.

### 3. `tools/sync/` (uv project, Python 3.12)

One module per stage; each stage reads its inputs from `.sync-cache/<song>/` and writes its
output there, so any stage can be re-run alone.

| Module | Responsibility | Output |
|---|---|---|
| `validate.py` | JSON Schema check; chord-symbol grammar (root, quality, extensions, slash bass); lyric words in `song.json` match the sheet's lyric words in order (case/punctuation-insensitive, fuzzy) | exit code + error list |
| `separate.py` | Demucs (`htdemucs`) vocal/accompaniment split | `vocals.wav`, `accompaniment.wav` |
| `lyrics.py` | wav2vec2 forced alignment (WhisperX aligner) of all words, sequentially over the whole song | `words.json` (word, start, end, score) |
| `beats.py` | Beat + downbeat tracking on accompaniment (librosa; madmom if accuracy requires) | `beats.json` |
| `chords.py` | Word-anchored chords: time = aligned word start, snapped to nearest beat. Instrumental `bars`: fill the gap between neighbouring vocal anchors on the beat grid; refine bar boundaries with chroma-template DTW against the expected chord sequence | chord timeline |
| `emit.py` | Write `chords.json` (existing format + additive `sections[]`) and `report.json` | final files |
| `cli.py` | `validate <song>`, `align <song> [--from <stage>]`, `check <song>`, `truth-candidates <song>`; environment preflight | — |

Lyric line timing: `start_time` = first word start, `end_time` = next line's start (matching
current player behaviour).

## Error handling

- **Preflight:** `cli.py` checks ffmpeg, Python version, and model availability before any
  work; prints the exact fix (e.g. `brew install ffmpeg`).
- **Sheet:** `validate` reports concrete, actionable errors (missing/extra line with its text,
  unknown chord symbol, bad word index). The skill retries at most 3 times.
- **Lyric alignment:** words below a score threshold are flagged. If more than 20% of a line's
  words are low-confidence, the line's start is interpolated from its neighbours and marked
  `interpolated` in the report.
- **Instrumental chords:** sections whose DTW fit cost exceeds a threshold are flagged with
  their time range.
- **Atomic output:** `chords.json` is written only when all stages succeed; a failed run never
  overwrites a good chart.

## Testing

- **Unit tests (pytest, no ML, fast):** validator with good/bad `song.json` fixtures; chord
  grammar; beat snapping; instrumental gap filling and DTW on synthetic chroma; emission into
  the `chords.json` shape.
- **Ground truth:** `public/library/let-it-be/truth.json` with ~15 hand-verified timestamps —
  every section start (explicitly including post-break, solo, and outro) plus several lyric
  line starts. `sync truth-candidates let-it-be` prints the pipeline's proposed times; the user
  confirms or corrects them by ear once.
- **Acceptance:** `sync check let-it-be` (also a pytest test behind a `slow` marker) passes when
  every lyric line start in `truth.json` is within ±250 ms and every section's first chord is
  within one beat.
- **Manual:** play the result in the app end to end.

## Housekeeping

- Add `.sync-cache/` to `.gitignore`.
- Add `public/library/let-it-be/sheet.txt` (no sheet exists yet; the current chords/lyrics live
  only in `chords.json` and the `scratch/` scripts).
- Remove `scratch/` sync scripts once Let It Be passes acceptance.
- Note: `*.mp3` is gitignored; song audio is force-added as today.

## Out of scope

In-app sync editor, chord recognition from audio, batch sync of all songs, fetching sheets from
the web, browser-side processing.
