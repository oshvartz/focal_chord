# -*- coding: utf-8 -*-
"""
Detect vocal onset and validate lyric timing against the actual audio.
"""
import json
import librosa
import numpy as np

AUDIO_PATH = r"C:\git\focal_chord\public\library\let-it-be\audio.mp3"
CHORDS_PATH = r"C:\git\focal_chord\public\library\let-it-be\chords.json"

print("Loading audio...")
y, sr = librosa.load(AUDIO_PATH, sr=22050, mono=True)
duration = librosa.get_duration(y=y, sr=sr)

# --- Method 1: RMS energy in vocal frequency band (300-3000 Hz) ---
print("Analyzing vocal frequency band energy...")

# Compute mel spectrogram
S = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128, fmax=8000)
S_db = librosa.power_to_db(S, ref=np.max)

# Focus on vocal range: roughly mel bands 20-80 (300Hz - 3kHz)
vocal_energy = np.mean(S_db[20:80, :], axis=0)
times = librosa.times_like(vocal_energy, sr=sr)

# Smooth with a 1-second window
hop = librosa.get_duration(y=y, sr=sr) / len(vocal_energy) 
window_size = max(1, int(1.0 / hop))
vocal_smooth = np.convolve(vocal_energy, np.ones(window_size)/window_size, mode='same')

# Find first significant jump (vocal entry)
baseline = np.percentile(vocal_smooth[:50], 50)  # baseline from first ~2s
threshold = baseline + 6  # 6dB above baseline
vocal_onset_idx = np.argmax(vocal_smooth > threshold)
vocal_onset_time = times[vocal_onset_idx]

print(f"Baseline vocal energy: {baseline:.1f} dB")
print(f"Threshold: {threshold:.1f} dB")
print(f"First vocal onset detected at: {vocal_onset_time:.3f}s")

# --- Method 2: Onset detection (transients) ---
print("\nDetecting onsets...")
onset_frames = librosa.onset.onset_detect(y=y, sr=sr, units='frames')
onset_times = librosa.frames_to_time(onset_frames, sr=sr)
print(f"Total onsets: {len(onset_times)}")
print("First 30 onsets:")
for i, t in enumerate(onset_times[:30]):
    print(f"  onset {i:3d}  t={t:.3f}s")

# --- Method 3: Spectral flux to find major changes ---
print("\nComputing spectral flux (major changes)...")
onset_env = librosa.onset.onset_strength(y=y, sr=sr)
onset_env_times = librosa.times_like(onset_env, sr=sr)

# Find peaks in onset strength
peaks = librosa.util.peak_pick(onset_env, pre_max=7, post_max=7, pre_avg=7, post_avg=7, delta=0.5, wait=10)
peak_times = onset_env_times[peaks]
print(f"Major spectral change points (first 20):")
for i, t in enumerate(peak_times[:20]):
    print(f"  peak {i:3d}  t={t:.3f}s  strength={onset_env[peaks[i]]:.2f}")

# --- Method 4: Harmonic content analysis to detect voice ---
print("\nAnalyzing harmonic content (voice detection)...")
harmonic, percussive = librosa.effects.hpss(y)
harm_rms = librosa.feature.rms(y=harmonic, frame_length=2048, hop_length=512)[0]
harm_times = librosa.times_like(harm_rms, sr=sr)

# Smooth
harm_smooth = np.convolve(harm_rms, np.ones(50)/50, mode='same')

# Find where harmonic energy significantly increases (voice entry)
harm_baseline = np.mean(harm_smooth[:100])
harm_threshold = harm_baseline * 3  # 3x increase
voice_onset_candidates = np.where(harm_smooth > harm_threshold)[0]
if len(voice_onset_candidates) > 0:
    voice_onset_time = harm_times[voice_onset_candidates[0]]
    print(f"Voice onset (harmonic analysis): {voice_onset_time:.3f}s")
else:
    print("Could not detect voice onset from harmonics")

# --- Print current lyrics timing ---
print("\n--- Current lyrics timing ---")
data = json.load(open(CHORDS_PATH, 'r'))
lyrics = data.get('lyrics', [])
for i, lyric in enumerate(lyrics):
    print(f"  [{i:2d}] {lyric['start_time']:7.2f}s - {lyric['end_time']:7.2f}s  {lyric['text']}")

# --- Summary ---
print("\n--- SUMMARY ---")
print(f"Audio duration: {duration:.2f}s")
print(f"Vocal onset (energy method):    {vocal_onset_time:.3f}s")
if len(voice_onset_candidates) > 0:
    print(f"Vocal onset (harmonic method):  {voice_onset_time:.3f}s")
print(f"Current first lyric starts at:  {lyrics[0]['start_time']:.3f}s")
print(f"Gap (lyric is late by):         {lyrics[0]['start_time'] - vocal_onset_time:.3f}s")

# --- Compute recommended offsets ---
# The lyrics should be synced to the actual vocal performance.
# Let's figure out the relationship between lyrics and beat positions.
beat_data = json.load(open(r"C:\git\focal_chord\scratch\beat_analysis.json", 'r'))
bar_times = beat_data['bar_times']

print(f"\n--- Beat grid around vocal onset ---")
for i, t in enumerate(bar_times):
    if t > vocal_onset_time + 10:
        break
    if t > vocal_onset_time - 5:
        print(f"  bar {i+1:3d}  t={t:.3f}s  {'<<< vocal onset nearby' if abs(t - vocal_onset_time) < 2 else ''}")

# Suggest new timing: shift all lyrics so first lyric aligns with detected vocal onset
offset = lyrics[0]['start_time'] - vocal_onset_time
print(f"\n--- Recommended: shift all lyrics by -{offset:.3f}s ---")
print("Proposed new lyrics timing:")
for i, lyric in enumerate(lyrics):
    new_start = lyric['start_time'] - offset
    new_end = lyric['end_time'] - offset
    print(f"  [{i:2d}] {new_start:7.2f}s - {new_end:7.2f}s  {lyric['text']}")
