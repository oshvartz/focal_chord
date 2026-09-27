import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const data = JSON.parse(
  await readFile(new URL('../public/library/let-it-be/chords.json', import.meta.url), 'utf8'),
);

const verse = ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C', 'Dm', 'C'];
const chorus = ['C', 'Am', 'G', 'F', 'C', 'C', 'G', 'F', 'C', 'Dm', 'C'];
const expectedChords = [
  ...verse, ...verse, ...verse, ...chorus, ...verse, ...verse, ...chorus,
  ...chorus, ...chorus, ...verse, ...verse, ...chorus, ...chorus,
];

const lyricRows = [
  ['When I find myself in times of trouble, Mother Mary comes to me', 13.328, 20.526],
  ['Speaking words of wisdom, let it be', 20.526, 27.191],
  ['And in my hour of darkness, she is standing right in front of me', 27.191, 33.692],
  ['Speaking words of wisdom, let it be', 33.692, 40.519],
  ['Let it be, let it be, let it be, let it be', 40.519, 47.206],
  ['Whisper words of wisdom, let it be', 47.206, 54.056],
  ['And when the broken hearted people, living in the world agree', 54.056, 60.511],
  ['There will be an answer, let it be', 60.511, 67.129],
  ['But though they may be parted, there is still a chance that they may see', 67.129, 73.863],
  ['There will be an answer, let it be', 73.863, 80.643],
  ['Let it be, let it be, let it be, let it be', 80.643, 87.353],
  ['There will be an answer, let it be', 87.353, 94.018],
  ['Let it be, let it be, let it be, let it be', 94.018, 100.682],
  ['Whisper words of wisdom, let it be', 100.682, 107.462],
  ['Let it be, let it be, let it be, let it be', 163.26, 170.249],
  ['Whisper words of wisdom, let it be', 170.249, 177.238],
  ['And when the night is cloudy, there is still a light that shines on me', 177.238, 184.157],
  ['Shine on till tomorrow, let it be', 184.157, 191.077],
  ['I wake up to the sound of music, Mother Mary comes to me', 191.077, 198.066],
  ['Speaking words of wisdom, let it be', 198.066, 204.986],
  ['Let it be, let it be, let it be, let it be', 204.986, 211.998],
  ['There will be an answer, let it be', 211.998, 218.918],
  ['Let it be, let it be, let it be, let it be', 218.918, 225.884],
  ['Whisper words of wisdom, let it be', 225.884, 233.105],
];

test('Let It Be matches the supplied chart and MP3 timeline', () => {
  assert.equal(data.metadata.duration, 243.027);
  assert.equal(data.metadata.audio_source, 'audio.mp3');
  assert.deepEqual(data.chords.map(({ chord }) => chord), expectedChords);
  assert.deepEqual(
    data.lyrics.map(({ text, start_time, end_time }) => [text, start_time, end_time]),
    lyricRows,
  );

  for (const entry of [...data.chords, ...data.lyrics]) {
    assert.ok(entry.start_time >= 0);
    assert.ok(entry.end_time > entry.start_time);
    assert.ok(entry.end_time <= data.metadata.duration);
  }

  for (let index = 1; index < data.chords.length; index += 1) {
    assert.ok(data.chords[index].start_time >= data.chords[index - 1].end_time);
  }

  assert.ok(data.chords.every(
    ({ end_time, start_time }) => end_time <= 107.462 || start_time >= 163.26,
  ));
  assert.equal(data.chords.at(-1).end_time, data.metadata.duration);
});
