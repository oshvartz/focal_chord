"""Stage: write chords.json (player format) and report.json."""
import json
import os
from pathlib import Path

from .chords import Event

LOW_WORD_SCORE = 0.3
SECONDS_PER_WORD_LIMIT = 1.6  # a line slower than this probably swallowed a missing line


def song_lines(song: dict) -> list[str]:
    return [line["text"] for s in song["sections"] for line in s.get("lines", [])]


def build_chart(song: dict, words: list[dict], events: list[Event], duration: float, audio_name: str) -> dict:
    chords = []
    for k, ev in enumerate(events):
        end = events[k + 1].time if k + 1 < len(events) else duration
        chords.append({"chord": ev.chord, "start_time": round(ev.time, 3), "end_time": round(end, 3)})

    lines = song_lines(song)
    starts = [min(w["start"] for w in words if w["line"] == i) for i in range(len(lines))]
    lyrics = []
    for i, text in enumerate(lines):
        end = starts[i + 1] if i + 1 < len(lines) else max(w["end"] for w in words if w["line"] == i) + 2.0
        lyrics.append({"text": text, "start_time": round(starts[i], 3), "end_time": round(end, 3)})

    sections, seen = [], set()
    for ev in events:
        if ev.section not in seen:
            seen.add(ev.section)
            sections.append({"type": song["sections"][ev.section]["type"], "start_time": round(ev.time, 3)})

    return {
        "metadata": {
            "title": song["title"],
            "artist": song["artist"],
            "duration": round(duration, 3),
            "audio_source": audio_name,
            "lyricOffset": 0,
        },
        "sections": sections,
        "chords": chords,
        "lyrics": lyrics,
    }


def build_report(song: dict, words: list[dict], events: list[Event]) -> dict:
    issues = []
    for i, text in enumerate(song_lines(song)):
        ws = [w for w in words if w["line"] == i]
        score = sum(w["score"] for w in ws) / len(ws)
        span = ws[-1]["end"] - ws[0]["start"]
        if span / len(ws) > SECONDS_PER_WORD_LIMIT:
            issues.append({"kind": "line_too_long", "line": i, "text": text, "start": ws[0]["start"],
                           "detail": f"spans {span:.1f}s for {len(ws)} words; a line may be missing from the sheet"})
        elif score < LOW_WORD_SCORE:
            issues.append({"kind": "low_confidence_line", "line": i, "text": text, "start": ws[0]["start"],
                           "detail": f"mean alignment score {score:.2f}"})
    for ev in events:
        for flag in ev.flags:
            issues.append({"kind": "chord", "chord": ev.chord, "start": round(ev.time, 3),
                           "section": song["sections"][ev.section]["type"], "detail": flag})
    return {"issues": issues}


def write_json_atomic(path: Path, data: dict) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    os.replace(tmp, path)
