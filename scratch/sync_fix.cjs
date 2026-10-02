const fs = require('fs');

const beats = JSON.parse(fs.readFileSync('C:/git/focal_chord/scratch/beat_analysis.json', 'utf8')).quarter_beat_times;

function getBeatTime(beatIndex) {
  if (beatIndex < 0) return 0;
  if (beatIndex >= beats.length) {
    const lastBeat = beats[beats.length - 1];
    const avgBeatDuration = (lastBeat - beats[0]) / beats.length;
    return lastBeat + (beatIndex - beats.length + 1) * avgBeatDuration;
  }
  return beats[beatIndex];
}

const VERSE_LINE_1 = [ ['C', 2], ['G', 2], ['Am', 1], ['Am7', 1], ['Fmaj7', 1], ['F6', 1] ];
const VERSE_LINE_2 = [ ['C', 2], ['G', 2], ['F', 2], ['C', 2] ];
const CHORUS_LINE_1 = [ ['Am', 2], ['G', 2], ['F', 2], ['C', 2] ];
const CHORUS_LINE_2 = [ ['C', 2], ['G', 2], ['F', 2], ['C', 2] ];
const OUTRO_LINE_1  = [ ['F', 2], ['C', 2], ['F6', 2], ['C', 2] ];
const OUTRO_LINE_2  = [ ['F', 2], ['C', 2], ['G', 2], ['C', 2] ];

const songStructure = [
  { chords: VERSE_LINE_1, duration: 8, lyric: "" },
  { chords: VERSE_LINE_2, duration: 8, lyric: "" },

  { chords: VERSE_LINE_1, duration: 8, lyric: "When I find myself in times of trouble, Mother Mary comes to me" },
  { chords: VERSE_LINE_2, duration: 8, lyric: "Speaking words of wisdom, let it be" },
  
  { chords: VERSE_LINE_1, duration: 8, lyric: "And in my hour of darkness, She is standing right in front of me" },
  { chords: VERSE_LINE_2, duration: 8, lyric: "Speaking words of wisdom, let it be" },

  { chords: CHORUS_LINE_1, duration: 8, lyric: "Let it be, let it be, let it be, let it be" },
  { chords: CHORUS_LINE_2, duration: 8, lyric: "Whisper words of wisdom, let it be" },

  { chords: VERSE_LINE_1, duration: 8, lyric: "And when the broken hearted people, Living in the world agree" },
  { chords: VERSE_LINE_2, duration: 8, lyric: "There will be an answer, let it be" },

  { chords: VERSE_LINE_1, duration: 8, lyric: "But though they may be parted, There is still a chance that they will see" },
  { chords: VERSE_LINE_2, duration: 8, lyric: "There will be an answer, let it be" },

  { chords: CHORUS_LINE_1, duration: 8, lyric: "Let it be, let it be, let it be, let it be" },
  { chords: CHORUS_LINE_2, duration: 8, lyric: "There will be an answer, let it be" },

  { chords: CHORUS_LINE_1, duration: 8, lyric: "Let it be, let it be, let it be, let it be" },
  { chords: CHORUS_LINE_2, duration: 8, lyric: "Whisper words of wisdom, let it be" },

  { chords: VERSE_LINE_1, duration: 8, lyric: "" },
  { chords: VERSE_LINE_2, duration: 8, lyric: "" },
  { chords: VERSE_LINE_1, duration: 8, lyric: "" },
  { chords: VERSE_LINE_2, duration: 8, lyric: "" },
  { chords: VERSE_LINE_1, duration: 8, lyric: "" },
  { chords: VERSE_LINE_2, duration: 8, lyric: "" },
  { chords: VERSE_LINE_1, duration: 8, lyric: "" },
  { chords: VERSE_LINE_2, duration: 8, lyric: "" },

  { chords: CHORUS_LINE_1, duration: 8, lyric: "Let it be, let it be, let it be, let it be" },
  { chords: CHORUS_LINE_2, duration: 8, lyric: "Whisper words of wisdom, let it be" },

  { chords: VERSE_LINE_1, duration: 8, lyric: "And when the night is cloudy, there is still a light that shines on me" },
  { chords: VERSE_LINE_2, duration: 8, lyric: "Shine on till tomorrow, let it be" },

  { chords: VERSE_LINE_1, duration: 8, lyric: "I wake up to the sound of music, Mother Mary comes to me" },
  { chords: VERSE_LINE_2, duration: 8, lyric: "Speaking words of wisdom, let it be" },

  { chords: CHORUS_LINE_1, duration: 8, lyric: "Let it be, let it be, let it be, let it be" },
  { chords: CHORUS_LINE_2, duration: 8, lyric: "Whisper words of wisdom, let it be" },

  { chords: CHORUS_LINE_1, duration: 8, lyric: "Let it be, let it be, let it be, let it be" },
  { chords: CHORUS_LINE_2, duration: 8, lyric: "Whisper words of wisdom, let it be" },

  { chords: OUTRO_LINE_1, duration: 8, lyric: "" },
  { chords: OUTRO_LINE_2, duration: 8, lyric: "" }
];

let currentBeat = 0;
const allChords = [];
const allLyrics = [];

// Apply negative offset to lyrics if desired, but we removed it because the UI handles offset dynamically now!
// Let's set it to 0 so the file is pure. The UI will apply the offset.
const LYRIC_OFFSET = 0; 

for (const block of songStructure) {
  const blockStartTime = getBeatTime(currentBeat);
  const blockEndTime = getBeatTime(currentBeat + block.duration);

  // Map Chords
  let chordBeatOffset = 0;
  for (const [chordName, chordDurationBeats] of block.chords) {
    const chordStartBeat = currentBeat + chordBeatOffset;
    const chordEndBeat = currentBeat + chordBeatOffset + chordDurationBeats;
    
    allChords.push({
      chord: chordName,
      start_time: Number(getBeatTime(chordStartBeat).toFixed(3)),
      end_time: Number(getBeatTime(chordEndBeat).toFixed(3))
    });
    
    chordBeatOffset += chordDurationBeats;
  }

  // Map Lyric
  if (block.lyric) {
    allLyrics.push({
      text: block.lyric,
      start_time: Math.max(0, Number((blockStartTime + LYRIC_OFFSET).toFixed(3))),
      end_time: Math.max(0, Number((blockEndTime + LYRIC_OFFSET).toFixed(3)))
    });
  }

  currentBeat += block.duration;
}

const dataPath = 'C:/git/focal_chord/public/library/let-it-be/chords.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
data.chords = allChords;
data.lyrics = allLyrics;
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

console.log('Successfully synced chords and lyrics based on direct block mapping!');
