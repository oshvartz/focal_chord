"""Stage: beat grid from the accompaniment stem."""
from pathlib import Path

import librosa
import numpy as np


def track_beats(accompaniment_path: Path) -> list[float]:
    """Return beat times in seconds."""
    y, sr = librosa.load(accompaniment_path, sr=22050, mono=True)
    _, frames = librosa.beat.beat_track(y=y, sr=sr, units="frames", tightness=400)
    return [round(float(t), 3) for t in librosa.frames_to_time(frames, sr=sr)]


def snap(time: float, beats: list[float], tolerance: float) -> float:
    """Move time to the nearest beat if one is within tolerance seconds."""
    if not beats:
        return time
    arr = np.asarray(beats)
    i = int(np.abs(arr - time).argmin())
    return float(arr[i]) if abs(arr[i] - time) <= tolerance else time
