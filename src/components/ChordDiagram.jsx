import Chord from '@tombatossals/react-chords/lib/Chord';
import chordVoicings from '../data/chordVoicings';

const instrument = {
  strings: 6,
  fretsOnChord: 4,
  name: 'Guitar',
  keys: [],
  tunings: {
    standard: ['E', 'A', 'D', 'G', 'B', 'E'],
  },
};

export default function ChordDiagram({ chordName, lite = false }) {
  const voicing = chordVoicings[chordName];

  if (!voicing) {
    return null;
  }

  return (
    <div className={lite ? 'w-16 h-16 md:w-20 md:h-20' : 'w-24 h-24 md:w-28 md:h-28'}>
      <Chord chord={voicing} instrument={instrument} lite={lite} />
    </div>
  );
}
