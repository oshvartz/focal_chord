"""sync align <song-dir>: audio + song.json -> chords.json, caching each stage in .sync-cache/."""
import argparse
import json
import sys
from pathlib import Path

import soundfile as sf

STAGES = ["separate", "words", "beats", "chords"]


def _repo_root() -> Path:
    here = Path.cwd().resolve()
    for p in [here, *here.parents]:
        if (p / "public" / "library").is_dir():
            return p
    raise SystemExit("run inside the focal_chord repo (public/library not found)")


def align(song_id: str, from_stage: str | None) -> int:
    from . import beats, chords, emit, lyrics, separate

    root = _repo_root()
    song_dir = root / "public" / "library" / song_id
    cache = root / ".sync-cache" / song_id
    audio = song_dir / "audio.mp3"
    song_path = cache / "song.json"
    for p in (audio, song_path):
        if not p.exists():
            raise SystemExit(f"missing {p}")
    song = json.loads(song_path.read_text())
    redo = set(STAGES[STAGES.index(from_stage):]) if from_stage else set()

    vocals, accomp = cache / "vocals.wav", cache / "accompaniment.wav"
    if "separate" in redo or not (vocals.exists() and accomp.exists()):
        print("separating stems…", file=sys.stderr)
        separate.separate(audio, cache)
        redo |= {"words", "beats"}

    lines = emit.song_lines(song)
    words_path = cache / "words.json"
    words = json.loads(words_path.read_text()) if words_path.exists() else None
    # Re-align whenever the sheet's lines changed, not just on request.
    if "words" in redo or words is None or words.get("lines") != lines:
        print("aligning words…", file=sys.stderr)
        words = {"lines": lines, "words": lyrics.align_words(vocals, lines)}
        emit.write_json_atomic(words_path, words)

    beats_path = cache / "beats.json"
    if "beats" in redo or not beats_path.exists():
        print("tracking beats…", file=sys.stderr)
        emit.write_json_atomic(beats_path, {"beats": beats.track_beats(accomp)})
    duration = sf.info(audio).duration
    grid = chords.extend_grid(json.loads(beats_path.read_text())["beats"], duration)

    print("placing chords…", file=sys.stderr)
    events = chords.build_events(song, words["words"])
    chords.place(events, grid, chords.beat_chroma(accomp, grid))
    timed = chords.retime_weak_lines(words["words"], events, lines)

    chart = emit.build_chart(song, timed, events, duration, audio.name)
    report = emit.build_report(song, words["words"], events)
    emit.write_json_atomic(song_dir / "chords.json", chart)
    emit.write_json_atomic(cache / "report.json", report)

    print(f"wrote {song_dir / 'chords.json'} ({len(chart['chords'])} chords, {len(chart['lyrics'])} lines)")
    for issue in report["issues"]:
        where = issue.get("text") or f"{issue.get('section')} {issue.get('chord')}"
        print(f"  ! {issue['start']:7.2f}s  {issue['kind']}: {where} — {issue['detail']}")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(prog="sync")
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("align", help="sync public/library/<song>/chords.json to its audio")
    p.add_argument("song")
    p.add_argument("--from", dest="from_stage", choices=STAGES, help="recompute from this stage on")
    args = parser.parse_args()
    if args.cmd == "align":
        raise SystemExit(align(args.song, args.from_stage))
