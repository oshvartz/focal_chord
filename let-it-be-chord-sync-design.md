# Let It Be chord and lyric synchronization

## Goal

Update `public/library/let-it-be/chords.json` so FocalChord presents the user-supplied *Let It Be* chord chart and lyric text in time with `public/library/let-it-be/audio.mp3`.

## Sources of truth

- The chord names, order, and section structure come exclusively from the chart supplied by the user. The chart replaces the current `Am7`, `Fmaj7`, and `F6` substitutions where they differ.
- The MP3 supplies the performance clock and beat positions used for timestamping. It does not determine the chord sequence.
- Lyric text comes from the user-supplied lyrics. Each lyric interval starts at the first sung word and ends at the last sung word.

## Data design

Keep the existing JSON schema:

- `metadata` identifies the song and its MP3 duration.
- `chords` is an ordered, contiguous list of `{ chord, start_time, end_time }` records.
- `lyrics` is an ordered list of `{ text, start_time, end_time }` records.

Map each chart chord to the corresponding detected beat or beat subdivision in the MP3. Retain printed chord changes such as `Dm` and the ending progression; do not infer replacements from the recording. Every timestamp is within the actual MP3 duration, and each chord interval ends exactly when the next one starts.

## Validation

Validate that the JSON parses, timestamps are monotonic and non-overlapping, all timestamps are within the MP3 duration, lyrics are ordered, and the resulting file preserves the requested chart labels and lyric text.
