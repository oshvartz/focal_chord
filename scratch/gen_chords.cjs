
const fs = require('fs');

const BPM = 74;
const BEAT = 60 / BPM;

function generateChords() {
  const chords = [];
  let currentBeat = 0;

  function add(chord, beats) {
    chords.push({
      chord: chord,
      start_time: Number((currentBeat * BEAT).toFixed(3)),
      end_time: Number(((currentBeat + beats) * BEAT).toFixed(3))
    });
    currentBeat += beats;
  }

  function playVerse() {
    // 32 beats
    for (let i = 0; i < 2; i++) {
      add('C', 2); add('G', 2); add('Am', 2); add('F', 2);
      add('C', 2); add('G', 2); add('F', 1); add('C', 1); add('Dm', 1); add('C', 1);
    }
  }

  function playChorus() {
    // 16 beats
    add('Am', 2); add('G', 2); add('F', 2); add('C', 2);
    add('C', 2); add('G', 2); add('F', 1); add('C', 1); add('Dm', 1); add('C', 1);
  }

  function playIntro() {
    // 16 beats
    add('C', 2); add('G', 2); add('Am', 2); add('F', 2);
    add('C', 2); add('G', 2); add('F', 1); add('C', 1); add('Dm', 1); add('C', 1);
  }

  function playOutro() {
    // 16 beats (just turnaround x2 and hold C)
    add('F', 1); add('C', 1); add('Dm', 1); add('C', 5); // 8
    add('F', 1); add('C', 1); add('Dm', 1); add('C', 5); // 8
  }

  // Structure based on 16-beat blocks
  // 0:00
  playIntro(); // beats 0-16
  // 0:13
  playVerse(); // Verse 1: beats 16-48
  // 0:39
  playChorus(); // Chorus 1: beats 48-64
  // 0:52
  playVerse(); // Verse 2: beats 64-96
  // 1:18
  playChorus(); // Chorus 2: beats 96-112
  // 1:31
  playChorus(); // Chorus 3: beats 112-128
  // 1:44
  playIntro(); // Organ Interlude: beats 128-144
  // 1:57
  playVerse(); // Guitar Solo: beats 144-176
  // 2:23
  playChorus(); // Chorus 4: beats 176-192
  // 2:36
  playVerse(); // Verse 3: beats 192-224
  // 3:02
  playChorus(); // Chorus 5: beats 224-240
  // 3:15
  playChorus(); // Chorus 6: beats 240-256
  // 3:28
  playChorus(); // Chorus 7: beats 256-272
  // 3:41
  playOutro(); // Outro

  return chords;
}

const dataPath = 'C:/git/focal_chord/public/library/let-it-be/chords.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

data.chords = generateChords();

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log('Successfully updated chords.json with precise 74 BPM mathematical grid.');

