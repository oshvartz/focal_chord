# -*- coding: utf-8 -*-
"""
Beat-detection and section-anchoring for Let It Be (encoding-safe version).
"""
import json, sys, os
os.environ["PYTHONIOENCODING"] = "utf-8"

import librosa
import numpy as np

AUDIO_PATH = r"C:\git\focal_chord\public\library\let-it-be\audio.mp3"

print("Loading audio...")
y, sr = librosa.load(AUDIO_PATH, sr=22050, mono=True)
duration = librosa.get_duration(y=y, sr=sr)
print(f"Duration: {duration:.2f}s  SR: {sr}")

# Beat tracking
print("Running beat tracker...")
tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units='frames')
beat_times = librosa.frames_to_time(beat_frames, sr=sr)
tempo_val = float(np.atleast_1d(tempo)[0])

# Librosa detected double-time (eighth notes). Halve it for quarter notes.
half_tempo = tempo_val / 2
print(f"Raw tempo: {tempo_val:.2f} BPM (eighth-note grid)")
print(f"Quarter-note tempo: {half_tempo:.2f} BPM")
print(f"Total eighth-note beats: {len(beat_times)}")

# Take every 2nd beat to get quarter-note positions
quarter_beats = beat_times[::2]
print(f"Quarter-note beats: {len(quarter_beats)}")
print(f"First beat: {quarter_beats[0]:.3f}s")
print(f"Last beat:  {quarter_beats[-1]:.3f}s")

# Print all quarter-note beat positions
print("\n-- Quarter-note beat positions --")
for i, t in enumerate(quarter_beats):
    bar = i // 4 + 1
    beat_in_bar = i % 4 + 1
    marker = " <<< DOWNBEAT" if beat_in_bar == 1 else ""
    print(f"  beat {i:3d}  bar {bar:2d}.{beat_in_bar}  t={t:7.3f}s{marker}")

# Bar start times
bar_times = quarter_beats[::4]
print(f"\n-- Bar start times ({len(bar_times)} bars) --")
for i, t in enumerate(bar_times):
    print(f"  bar {i+1:3d}  t={t:7.3f}s")

# 8-bar block boundaries
print("\n-- 8-bar block boundaries --")
for i in range(0, len(bar_times), 8):
    print(f"  block at bar {i+1:3d}  t={bar_times[i]:7.3f}s")

# Tempo stability per 8 beats
print("\n-- Local tempo (per 4 quarter beats = 1 bar) --")
diffs = np.diff(quarter_beats)
for i in range(0, len(diffs) - 3, 4):
    window = diffs[i:i+4]
    avg = np.mean(window)
    local_bpm = 60.0 / avg
    bar = i // 4 + 1
    print(f"  bar {bar:3d}  avg_beat={avg:.4f}s  bpm={local_bpm:.1f}")

# Save full data
output = {
    "tempo_bpm": round(half_tempo, 2),
    "raw_tempo_bpm": round(tempo_val, 2),
    "beat_count": len(quarter_beats),
    "duration": round(duration, 3),
    "first_beat": round(float(quarter_beats[0]), 3),
    "quarter_beat_times": [round(float(t), 3) for t in quarter_beats],
    "bar_times": [round(float(t), 3) for t in bar_times],
}

out_path = r"C:\git\focal_chord\scratch\beat_analysis.json"
with open(out_path, "w") as f:
    json.dump(output, f, indent=2)

print(f"\nSaved to {out_path}")
