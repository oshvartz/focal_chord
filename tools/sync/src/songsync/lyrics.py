"""Stage: forced-align every sung word to the vocal stem (wav2vec2 / torchaudio MMS_FA)."""
import re
from pathlib import Path

import librosa
import numpy as np
import scipy.ndimage
import torch
import torchaudio

GATE_SAMPLE_RATE = 16000
SILENCE_DB = -35  # relative to the loudest vocal frame
GATE_PAD_FRAMES = 10  # 200 ms either side of detected vocals
CHUNK_SECONDS = 20
CONTEXT_SECONDS = 3
FRAME_SAMPLES = 320  # wav2vec2 frame stride at 16 kHz (20 ms)


def normalize_word(word: str) -> str:
    """Reduce a lyric word to the aligner's alphabet (lowercase a-z and apostrophe)."""
    return re.sub(r"[^a-z']", "", word.lower())


def _emission(waveform: torch.Tensor, model, sample_rate: int) -> torch.Tensor:
    # Full-song attention would need many GB, so run overlapping chunks and keep each chunk's
    # centre: words cut at a hard chunk edge align badly.
    chunk = CHUNK_SECONDS * sample_rate
    context = CONTEXT_SECONDS * sample_rate
    total = waveform.size(1)
    parts = []
    with torch.inference_mode():
        for start in range(0, total, chunk):
            lo, hi = max(0, start - context), min(total, start + chunk + context)
            emission, _ = model(waveform[:, lo:hi])
            emission = emission[0]
            lead = round((start - lo) / FRAME_SAMPLES)
            keep = round((min(start + chunk, total) - start) / FRAME_SAMPLES)
            piece = emission[lead : lead + keep]
            if piece.size(0) < keep:  # conv edge loses a frame or two at the very end
                piece = torch.cat([piece, piece[-1:].expand(keep - piece.size(0), -1)])
            parts.append(piece)
    return torch.cat(parts)


def _gate_silence(emission: torch.Tensor, audio, labels: dict, seconds_per_frame: float) -> None:
    """Forbid letters in frames where the vocal stem is quiet, so words cannot drift into
    solos or breaks. Only blank and star stay possible there. Modifies emission in place."""
    hop = round(seconds_per_frame * GATE_SAMPLE_RATE)
    rms = librosa.feature.rms(y=audio, frame_length=hop * 4, hop_length=hop)[0]
    db = librosa.amplitude_to_db(rms, ref=np.max)
    # Widen voiced regions slightly so consonant onsets/tails stay alignable.
    voiced = scipy.ndimage.binary_dilation(db > SILENCE_DB, iterations=GATE_PAD_FRAMES)
    voiced = np.pad(voiced, (0, max(0, emission.size(0) - voiced.size)))[: emission.size(0)]
    silent = torch.from_numpy(~voiced)
    keep = torch.zeros(emission.size(1), dtype=torch.bool)
    keep[labels["-"]] = True
    keep[labels["*"]] = True
    emission[silent.nonzero(as_tuple=True)[0][:, None], (~keep).nonzero(as_tuple=True)[0]] = -1e4


def align_words(vocals_path: Path, lines: list[str]) -> list[dict]:
    """Return one entry per lyric word: {line, word, text, start, end, score}.

    `word` indexes into line.split(), matching the chord anchors in song.json.
    Words with no alignable characters (e.g. "—") get the times of the previous word and score 0.
    """
    bundle = torchaudio.pipelines.MMS_FA
    # The star token absorbs non-vocal stretches (solos, breaks) between lines.
    model = bundle.get_model(with_star=True)
    tokenizer = bundle.get_tokenizer()
    aligner = bundle.get_aligner()

    audio, _ = librosa.load(vocals_path, sr=bundle.sample_rate, mono=True)
    waveform = torch.from_numpy(audio)[None]
    emission = _emission(waveform, model, bundle.sample_rate)
    seconds_per_frame = waveform.size(1) / emission.size(0) / bundle.sample_rate
    _gate_silence(emission, audio, bundle.get_dict(star="*"), seconds_per_frame)

    entries = []
    alignable = [(None, "*")]
    for li, line in enumerate(lines):
        for wi, raw in enumerate(line.split()):
            entry = {"line": li, "word": wi, "text": raw, "start": None, "end": None, "score": 0.0}
            entries.append(entry)
            norm = normalize_word(raw)
            if norm:
                alignable.append((entry, norm))
        alignable.append((None, "*"))

    spans = aligner(emission, tokenizer([norm for _, norm in alignable]))
    for (entry, _), word_spans in zip(alignable, spans):
        if entry is None:
            continue
        frames = sum(s.end - s.start for s in word_spans)
        entry["start"] = round(word_spans[0].start * seconds_per_frame, 3)
        entry["end"] = round(word_spans[-1].end * seconds_per_frame, 3)
        entry["score"] = round(sum(s.score * (s.end - s.start) for s in word_spans) / frames, 3)

    previous = {"start": 0.0, "end": 0.0}
    for entry in entries:
        if entry["start"] is None:
            entry["start"], entry["end"] = previous["end"], previous["end"]
        previous = entry
    return entries
