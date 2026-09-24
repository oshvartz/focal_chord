import { useRef, useState, useCallback, useEffect } from 'react';
import { useMotionValue } from 'framer-motion';

export function useAudioEngine() {
  const audioRef = useRef(null);
  const rafRef = useRef(null);
  const currentTime = useMotionValue(0);
  const duration = useMotionValue(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const tick = useCallback(() => {
    if (audioRef.current) {
      currentTime.set(audioRef.current.currentTime);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [currentTime]);

  const startLoop = useCallback(() => {
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      startLoop();
    }
  }, [startLoop]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      stopLoop();
      // Update one last time
      if (audioRef.current) {
        currentTime.set(audioRef.current.currentTime);
      }
    }
  }, [stopLoop, currentTime]);

  const restart = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      currentTime.set(0);
      play();
    }
  }, [currentTime, play]);

  const seek = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      currentTime.set(time);
    }
  }, [currentTime]);

  const loadAudio = useCallback((src) => {
    stopLoop();
    setIsPlaying(false);
    currentTime.set(0);
    if (audioRef.current) {
      audioRef.current.src = src;
      audioRef.current.load();
    }
  }, [stopLoop, currentTime]);

  // Set up audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      duration.set(audio.duration);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      stopLoop();
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      stopLoop();
    };
  }, [duration, stopLoop]);

  return {
    audioRef,
    currentTime,
    duration,
    isPlaying,
    play,
    pause,
    restart,
    seek,
    loadAudio,
  };
}
