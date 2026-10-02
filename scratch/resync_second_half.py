# -*- coding: utf-8 -*-
"""
Re-detect beats in the second half of Let It Be and rebuild
post-break chord/lyric timestamps. Keeps the first half intact.
"""
import json, os, sys
os.environ["PYTHONIOENCODING"] = "utf-8"

import librosa
import numpy as np

AUDIO_PATH = r"C:\git\focal_chord\public\library\let-it-be\audio.mp3"
CHORDS_PATH = r"C:\git\focal_chord\public\library\let-it-be\chords.json"
SONG_DURATION = 243.027

# ── Chord patterns ──────────────────────────────────────────────
verse = [('C',2),('G',2),('Am',2),('F',2),('C',2),('G',2),('F',1),('C',1),('Dm',1),('C',1)]
chorus = [('C',2),('Am',2),('G',2),('F',1),('C',1),('C',2),('G',2),('F',1),('C',1),('Dm',1),('C',1)]

# Post-break sections (beat offsets relative to the anchor beat)
post_sections = [
    (0,  chorus),   # original beat 192
    (16, verse),    # original beat 208
    (32, verse),    # original beat 224
    (48, chorus),   # original beat 240
    (64, chorus),   # original beat 256
]

# Post-break lyrics (2 per section, each spanning 8 beats)
lyric_texts = [
    "Let it be, let it be, let it be, let it be",
    "Whisper words of wisdom, let it be",
    "And when the night is cloudy, there is still a light that shines on me",
    "Shine on till tomorrow, let it be",
    "I wake up to the sound of music, Mother Mary comes to me",
    "Speaking words of wisdom, let it be",
    "Let it be, let it be, let it be, let it be",
    "There will be an answer, let it be",
    "Let it be, let it be, let it be, let it be",
    "Whisper words of wisdom, let it be",
]

# ── Load audio ──────────────────────────────────────────────────
print("Loading audio...")
y, sr = librosa.load(AUDIO_PATH, sr=22050, mono=True)
duration = librosa.get_duration(y=y, sr=sr)
print(f"Audio duration: {duration:.3f}s")

# ── Detect beats from 145s onwards ──────────────────────────────
SEGMENT_START = 145.0
start_sample = int(SEGMENT_START * sr)
y_seg = y[start_sample:]

print(f"\nDetecting beats from {SEGMENT_START}s...")
tempo, beat_frames = librosa.beat.beat_track(y=y_seg, sr=sr, units='frames')
beat_times = librosa.frames_to_time(beat_frames, sr=sr) + SEGMENT_START
tempo_val = float(np.atleast_1d(tempo)[0])
print(f"Eighth-note tempo: {tempo_val:.2f} BPM")
print(f"Quarter-note tempo: {tempo_val/2:.2f} BPM")
print(f"Detected {len(beat_times)} eighth-note beats")

# ── Pick quarter-note phase (even vs odd) ───────────────────────
qb_even = beat_times[::2]
qb_odd = beat_times[1::2]
var_even = np.var(np.diff(qb_even)) if len(qb_even) > 2 else float('inf')
var_odd = np.var(np.diff(qb_odd)) if len(qb_odd) > 2 else float('inf')
print(f"\nEven-phase interval variance: {var_even:.6f}  ({len(qb_even)} beats)")
print(f"Odd-phase interval variance:  {var_odd:.6f}  ({len(qb_odd)} beats)")

quarter_beats = qb_even if var_even <= var_odd else qb_odd
phase = "even" if var_even <= var_odd else "odd"
print(f"Selected: {phase} phase")

# ── Find anchor beat (start of post-break ~163s) ────────────────
TARGET = 163.0
anchor_idx = int(np.argmin(np.abs(quarter_beats - TARGET)))
anchor_time = float(quarter_beats[anchor_idx])
print(f"\nAnchor beat: index {anchor_idx} at {anchor_time:.3f}s (target: {TARGET}s)")

# Print local beat intervals around anchor for inspection
print("\nBeats around anchor:")
for i in range(max(0, anchor_idx-3), min(len(quarter_beats), anchor_idx+6)):
    marker = " <<< ANCHOR" if i == anchor_idx else ""
    print(f"  beat {i:3d}  t={quarter_beats[i]:8.3f}s{marker}")

# ── Extrapolate if needed (need 81 beats from anchor) ──────────
needed = anchor_idx + 81
if needed > len(quarter_beats):
    avg = float(np.mean(np.diff(quarter_beats[max(0, anchor_idx-4):])))
    print(f"\nExtrapolating {needed - len(quarter_beats)} beats (avg interval: {avg:.3f}s)")
    while len(quarter_beats) < needed:
        quarter_beats = np.append(quarter_beats, quarter_beats[-1] + avg)

# ── Helper ──────────────────────────────────────────────────────
def beat_time(offset):
    return round(float(quarter_beats[anchor_idx + offset]), 3)

# ── Build post-break chords ─────────────────────────────────────
new_post_chords = []
for sec_offset, pattern in post_sections:
    beat = sec_offset
    for chord_name, num_beats in pattern:
        new_post_chords.append({
            'chord': chord_name,
            'start_time': beat_time(beat),
            'end_time': beat_time(beat + num_beats),
        })
        beat += num_beats

# Final chord sustains to end of song
new_post_chords[-1]['end_time'] = SONG_DURATION
print(f"\nBuilt {len(new_post_chords)} post-break chords")

# ── Build post-break lyrics ─────────────────────────────────────
new_post_lyrics = []
for i, text in enumerate(lyric_texts):
    sec_idx = i // 2
    half = i % 2
    sec_offset = post_sections[sec_idx][0]
    start_off = sec_offset + half * 8
    end_off = start_off + 8
    new_post_lyrics.append({
        'text': text,
        'start_time': beat_time(start_off),
        'end_time': beat_time(end_off),
    })
print(f"Built {len(new_post_lyrics)} post-break lyrics")

# ── Load existing data, split at the break ──────────────────────
with open(CHORDS_PATH) as f:
    song_data = json.load(f)

pre_chords = [c for c in song_data['chords'] if c['end_time'] <= 108.0]
pre_lyrics = [l for l in song_data['lyrics'] if l['end_time'] <= 108.0]

assert len(pre_chords) == 83, f"Expected 83 pre-break chords, got {len(pre_chords)}"
assert len(pre_lyrics) == 14, f"Expected 14 pre-break lyrics, got {len(pre_lyrics)}"
assert len(new_post_chords) == 53, f"Expected 53 post-break chords, got {len(new_post_chords)}"
assert len(new_post_lyrics) == 10, f"Expected 10 post-break lyrics, got {len(new_post_lyrics)}"

total_chords = len(pre_chords) + len(new_post_chords)
total_lyrics = len(pre_lyrics) + len(new_post_lyrics)
print(f"\nTotals: {total_chords} chords (expect 136), {total_lyrics} lyrics (expect 24)")

# ── Show comparison ─────────────────────────────────────────────
old_post = [c for c in song_data['chords'] if c['start_time'] >= 163.0]
print("\n-- Timestamp diff: old vs new (post-break chords) --")
print(f"  {'Chord':5s}  {'Old start':>10s}  {'New start':>10s}  {'Diff':>8s}")
for i in range(len(new_post_chords)):
    o = old_post[i] if i < len(old_post) else None
    n = new_post_chords[i]
    if o:
        diff = n['start_time'] - o['start_time']
        print(f"  {n['chord']:5s}  {o['start_time']:10.3f}  {n['start_time']:10.3f}  {diff:+8.3f}s")
    else:
        print(f"  {n['chord']:5s}  {'N/A':>10s}  {n['start_time']:10.3f}")

# ── Write back ──────────────────────────────────────────────────
song_data['chords'] = pre_chords + new_post_chords
song_data['lyrics'] = pre_lyrics + new_post_lyrics

with open(CHORDS_PATH, 'w') as f:
    json.dump(song_data, f, indent=2)
    f.write('\n')

print(f"\nDONE - Updated {CHORDS_PATH}")
print("Refresh the app to test the new timestamps.")
