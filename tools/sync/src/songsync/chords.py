"""Stage: place every chord in time.

The chord sequence comes from the sheet, so placement is an alignment problem: choose a
start beat for every chord, in order, that best fits the accompaniment's harmony while
respecting notated beat counts and staying near the sung word each chord is written over.
Word anchors pull in proportion to their alignment confidence, so a badly aligned lyric
line cannot drag its chords off; they follow the harmony and the bar structure instead.
Solved exactly with dynamic programming over the beat grid.
"""
import re
from dataclasses import dataclass, field

import librosa
import numpy as np

NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
MAX_QUARTERS = 8  # longest chord considered (two bars of 4/4)
ANCHOR_PULL = 6.0  # cost per second away from a fully confident word anchor
ANCHOR_SLACK = 0.15  # seconds of free play: singers anticipate or lag the change
NOTATED_PULL = 1.5  # cost per grid step away from a notated beat count
FREE_PULL = 1.0  # cost per octave away from a half bar, for chords with no beat count
OFFBEAT_COST = 0.3  # starting between quarter notes when the grid is in eighths
WEAK_FIT = 0.0  # relative fit below this means the chord barely matches the audio
DRIFT_FLAG = 0.6  # seconds: a confident anchor overruled by this much is suspicious


@dataclass
class Event:
    chord: str
    section: int
    beats: float | None = None  # duration in quarter notes, when notated
    anchor: float | None = None  # sung word start
    weight: float = 0.0  # anchor confidence, 0..1
    line: int | None = None
    time: float | None = None
    flags: list[str] = field(default_factory=list)


def chord_template(symbol: str) -> np.ndarray:
    """12-bin pitch-class profile for a chord symbol like 'Am7', 'F/C', 'Gsus4'."""
    m = re.match(r"^([A-G])([#b]?)(.*?)(?:/([A-G])([#b]?))?$", symbol)
    if not m:
        raise ValueError(f"unparseable chord {symbol!r}")
    root = (NOTE[m[1]] + {"#": 1, "b": -1, "": 0}[m[2]]) % 12
    quality = m[3]
    third = 3 if re.match(r"^(m(?!aj)|min|dim)", quality) else 4
    if quality.startswith("sus2"):
        third = 2
    elif quality.startswith("sus"):
        third = 5
    fifth = 6 if "dim" in quality else 8 if "aug" in quality else 7
    weights = {0: 1.0, third: 1.0, fifth: 0.8}
    if "maj7" in quality:
        weights[11] = 0.5
    elif "7" in quality:
        weights[10] = 0.5
    if "6" in quality:
        weights[9] = 0.5
    v = np.zeros(12)
    for interval, w in weights.items():
        v[(root + interval) % 12] += w
    if m[4]:
        v[(NOTE[m[4]] + {"#": 1, "b": -1, "": 0}[m[5]]) % 12] += 0.5
    return v / np.linalg.norm(v)


def beat_chroma(accompaniment_path, beats: list[float], sr=22050, hop=512) -> np.ndarray:
    """Mean chroma per beat interval, shape (12, len(beats)); the last interval runs to the end."""
    y, sr = librosa.load(accompaniment_path, sr=sr, mono=True)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)
    frames = librosa.time_to_frames(beats, sr=sr, hop_length=hop)
    return librosa.util.sync(chroma, frames, aggregate=np.mean)[:, -len(beats):]


def extend_grid(beats: list[float], duration: float) -> list[float]:
    """Continue the grid at the median step to the end of the audio: trackers stop early
    once the drums do, but a ringing outro still needs room for its chords."""
    step = float(np.median(np.diff(beats)))
    extra = np.arange(beats[-1] + step, duration - step / 2, step)
    return list(beats) + [round(float(t), 3) for t in extra]


def quarter_steps(beats: list[float]) -> int:
    """Grid steps per quarter note: trackers lock onto eighths in slow songs (above 110 BPM)."""
    return 2 if 60 / float(np.median(np.diff(beats))) > 110 else 1


def build_events(song: dict, words: list[dict]) -> list[Event]:
    by_pos = {(w["line"], w["word"]): w for w in words}
    events, line_index = [], 0
    for si, section in enumerate(song["sections"]):
        for line in section.get("lines", []):
            for c in line["chords"]:
                if "word" in c:
                    w = by_pos[(line_index, c["word"])]
                    events.append(Event(c["chord"], si, c.get("beats"), anchor=w["start"],
                                        weight=float(np.clip(w["score"], 0, 1)) ** 2, line=line_index))
                else:
                    events.append(Event(c["chord"], si, c["beats"], line=line_index))
            line_index += 1
        for bar in section.get("bars", []):
            chords, bar_beats = (bar["chords"], bar["beats"]) if isinstance(bar, dict) else (bar, 4)
            for ch in chords:
                events.append(Event(ch, si, bar_beats / len(chords)))
    return events


def _span_fits(chroma: np.ndarray, symbols: list[str], max_steps: int) -> dict[int, np.ndarray]:
    """fits[d][u, j]: harmonic fit of chord u over steps j..j+d, relative to the average chord,
    so only distinguishing evidence counts."""
    templates = np.stack([chord_template(s) for s in symbols])
    cum = np.concatenate([np.zeros((12, 1)), np.cumsum(chroma.astype(np.float64), axis=1)], axis=1)
    fits = {}
    for d in range(1, max_steps + 1):
        sums = cum[:, d:] - cum[:, :-d]
        # macOS Accelerate raises spurious FP warnings in matmul; the inputs are finite.
        with np.errstate(all="ignore"):
            cos = templates @ sums / np.maximum(np.linalg.norm(sums, axis=0), 1e-9)
        fits[d] = cos - cos.mean(axis=0)
    return fits


def place(events: list[Event], beats: list[float], chroma: np.ndarray) -> list[Event]:
    grid = np.asarray(beats)
    n_steps = len(grid)
    unit = quarter_steps(beats)
    max_d = MAX_QUARTERS * unit
    symbols = sorted({e.chord for e in events})
    index = {s: i for i, s in enumerate(symbols)}
    fits = _span_fits(chroma, symbols, max_d)
    offbeat = np.where(np.arange(n_steps) % unit, OFFBEAT_COST, 0.0)

    def start_cost(ev: Event) -> np.ndarray:
        cost = offbeat.copy()
        if ev.anchor is not None:
            cost += ANCHOR_PULL * ev.weight * np.maximum(0, np.abs(grid - ev.anchor) - ANCHOR_SLACK)
        return cost

    def length_cost(ev: Event, d: int) -> float:
        if ev.beats is not None:
            return NOTATED_PULL * abs(d - ev.beats * unit)
        return FREE_PULL * abs(np.log2(d / (2 * unit)))

    # best[j]: cheapest way to place the events so far with the next one starting at step j.
    best = np.full(n_steps + 1, np.inf)
    best[0] = 0.0  # the first chord starts on the first beat
    choices = []
    for ev in events[:-1]:
        here = best[:n_steps] + start_cost(ev)
        nxt = np.full(n_steps + 1, np.inf)
        arg = np.zeros(n_steps + 1, dtype=int)
        u = index[ev.chord]
        for d in range(1, max_d + 1):
            cand = here[: n_steps + 1 - d] - fits[d][u] * d + length_cost(ev, d)
            better = cand < nxt[d:]
            nxt[d:][better] = cand[better]
            arg[d:][better] = d
        choices.append(arg)
        best = nxt

    # The last chord rings out to the end of the song; score it over at most max_d steps.
    last = events[-1]
    tail = np.array([fits[min(max_d, n_steps - j)][index[last.chord], j] * min(max_d, n_steps - j)
                     for j in range(n_steps)])
    j = int(np.argmin(best[:n_steps] + start_cost(last) - tail))
    if not np.isfinite(best[j]):
        raise ValueError("no feasible chord placement; the sheet has more chords than the song has beats")

    starts = [j]
    for arg in reversed(choices):
        j -= arg[j]
        starts.append(j)
    starts.reverse()

    for k, (ev, s) in enumerate(zip(events, starts)):
        ev.time = float(grid[s])
        end = starts[k + 1] if k + 1 < len(events) else min(n_steps, s + max_d)
        d = max(1, min(end - s, max_d))
        if d >= 2 * unit and fits[d][index[ev.chord], s] < WEAK_FIT:
            ev.flags.append("weak harmonic match")
        if ev.anchor is not None and ev.weight > 0.3 and abs(ev.time - ev.anchor) > DRIFT_FLAG:
            ev.flags.append(f"placed {ev.time - ev.anchor:+.2f}s from its word; check the sheet's chord position")
    return events


def retime_weak_lines(words: list[dict], events: list[Event], lines: list[str],
                      weak: float = 0.3, strong: float = 0.5) -> list[dict]:
    """Shift poorly aligned lyric lines to sit on their chords.

    Repeated lines (choruses) usually have a confidently aligned instance; its lead from
    line start to its first anchored chord is reused for the weak instances, whose chords
    were placed from harmony rather than from their unreliable word times.
    """
    words = [dict(w) for w in words]
    by_line: dict[int, list[dict]] = {}
    for w in words:
        by_line.setdefault(w["line"], []).append(w)
    first_chord = {}
    for ev in events:
        if ev.anchor is not None and ev.line not in first_chord:
            first_chord[ev.line] = ev
    score = {i: float(np.mean([w["score"] for w in ws])) for i, ws in by_line.items()}

    def key(text):
        return re.sub(r"[^a-z ]", "", text.lower()).split()

    for i, text in enumerate(lines):
        if score[i] >= weak or i not in first_chord:
            continue
        refs = [r for r in range(len(lines)) if key(lines[r]) == key(text) and score[r] >= strong and r in first_chord]
        if not refs:
            continue
        ref = max(refs, key=lambda r: score[r])
        lead = first_chord[ref].time - by_line[ref][0]["start"]
        shift = first_chord[i].time - lead - by_line[i][0]["start"]
        for w in by_line[i]:
            w["start"] = round(w["start"] + shift, 3)
            w["end"] = round(w["end"] + shift, 3)
            w["retimed"] = True
    return words
