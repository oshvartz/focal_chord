import { useRef, useState, useCallback } from 'react';
import { useMotionValueEvent } from 'framer-motion';

function binarySearch(items, time) {
  let lo = 0;
  let hi = items.length - 1;
  let result = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (items[mid].start_time <= time) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

export function useLyricIndex(lyrics, currentTime) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const lastIndexRef = useRef(-1);

  const findIndex = useCallback((time) => {
    if (!lyrics || lyrics.length === 0) return -1;
    const idx = binarySearch(lyrics, time);
    if (idx >= 0 && time <= lyrics[idx].end_time) {
      return idx;
    }
    return -1;
  }, [lyrics]);

  useMotionValueEvent(currentTime, 'change', (time) => {
    const idx = findIndex(time);
    if (idx !== lastIndexRef.current) {
      lastIndexRef.current = idx;
      setActiveIndex(idx);
    }
  });

  const seekToIndex = useCallback((time) => {
    const idx = findIndex(time);
    lastIndexRef.current = idx;
    setActiveIndex(idx);
    return idx;
  }, [findIndex]);

  return { activeIndex, seekToIndex };
}
