"""Stage: split the mix into vocals and accompaniment with Demucs."""
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
import torchaudio
from demucs.apply import apply_model
from demucs.pretrained import get_model


def separate(audio_path: Path, out_dir: Path) -> tuple[Path, Path]:
    """Write vocals.wav and accompaniment.wav into out_dir and return their paths."""
    model = get_model("htdemucs")
    model.eval()

    data, sr = sf.read(audio_path, dtype="float32", always_2d=True)  # (frames, channels)
    if data.shape[1] == 1:
        data = np.repeat(data, 2, axis=1)
    wav = torch.from_numpy(data.T.copy())  # (channels, frames)
    if sr != model.samplerate:
        wav = torchaudio.functional.resample(wav, sr, model.samplerate)
        sr = model.samplerate

    # Demucs expects normalised input; undo the normalisation on the way out.
    ref = wav.mean(0)
    mean, std = ref.mean(), ref.std()
    with torch.inference_mode():
        sources = apply_model(model, ((wav - mean) / std)[None], device="cpu", progress=True)[0]
    sources = sources * std + mean

    vocals = sources[model.sources.index("vocals")]
    accompaniment = sources.sum(0) - vocals

    out_dir.mkdir(parents=True, exist_ok=True)
    vocals_path = out_dir / "vocals.wav"
    accomp_path = out_dir / "accompaniment.wav"
    sf.write(vocals_path, vocals.numpy().T, sr)
    sf.write(accomp_path, accompaniment.numpy().T, sr)
    return vocals_path, accomp_path
