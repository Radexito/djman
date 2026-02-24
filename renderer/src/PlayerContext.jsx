import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  if (!audioRef.current) audioRef.current = new Audio();
  const audio = audioRef.current;

  const [currentTrack, setCurrentTrack]       = useState(null);
  const [currentPlaylistId, setCurrentPlaylistId] = useState(null);
  const [queue, setQueue]                     = useState([]);
  const [queueIndex, setQueueIndex]           = useState(-1);
  const [isPlaying, setIsPlaying]             = useState(false);
  const [currentTime, setCurrentTime]         = useState(0);
  const [duration, setDuration]               = useState(0);
  const [shuffle, setShuffle]                 = useState(false);
  const [repeat, setRepeat]                   = useState('none'); // 'none' | 'all' | 'one'
  const [outputDeviceId, setOutputDeviceId]   = useState('');

  // Keep mutable refs so event handlers always see latest values
  const queueRef      = useRef(queue);
  const idxRef        = useRef(queueIndex);
  const shuffleRef    = useRef(shuffle);
  const repeatRef     = useRef(repeat);
  useEffect(() => { queueRef.current   = queue;      }, [queue]);
  useEffect(() => { idxRef.current     = queueIndex; }, [queueIndex]);
  useEffect(() => { shuffleRef.current = shuffle;    }, [shuffle]);
  useEffect(() => { repeatRef.current  = repeat;     }, [repeat]);

  // Stable play-at-index — exposed via ref so handleEnded can call it without stale closure
  const playAtIndexRef = useRef(null);
  const playAtIndex = useCallback((newQueue, index, playlistId = null) => {
    const track = newQueue[index];
    if (!track) return;
    audio.src = `media://${track.file_path}`;
    audio.play().catch(console.error);
    setCurrentTrack(track);
    setQueue(newQueue);
    setQueueIndex(index);
    setCurrentPlaylistId(playlistId); // always update; null = playing from library
  }, [audio]);
  playAtIndexRef.current = playAtIndex;

  // Register audio event listeners once
  useEffect(() => {
    const onTimeUpdate    = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(isNaN(audio.duration) ? 0 : audio.duration);
    const onPlay          = () => setIsPlaying(true);
    const onPause         = () => setIsPlaying(false);
    const onEnded         = () => {
      const q   = queueRef.current;
      const idx = idxRef.current;
      const rep = repeatRef.current;
      const shuf = shuffleRef.current;
      if (rep === 'one') {
        audio.currentTime = 0;
        audio.play().catch(console.error);
        return;
      }
      if (shuf) {
        playAtIndexRef.current(q, Math.floor(Math.random() * q.length));
      } else if (idx < q.length - 1) {
        playAtIndexRef.current(q, idx + 1);
      } else if (rep === 'all' && q.length > 0) {
        playAtIndexRef.current(q, 0);
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('timeupdate',     onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play',           onPlay);
    audio.addEventListener('pause',          onPause);
    audio.addEventListener('ended',          onEnded);
    return () => {
      audio.removeEventListener('timeupdate',     onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play',           onPlay);
      audio.removeEventListener('pause',          onPause);
      audio.removeEventListener('ended',          onEnded);
    };
  }, [audio]);

  const play = useCallback((track, newQueue, index, playlistId = null) => {
    playAtIndex(newQueue, index, playlistId);
  }, [playAtIndex]);

  const togglePlay = useCallback(() => {
    if (audio.paused) audio.play().catch(console.error);
    else audio.pause();
  }, [audio]);

  const next = useCallback(() => {
    const q = queueRef.current;
    const idx = idxRef.current;
    if (shuffleRef.current) {
      playAtIndexRef.current(q, Math.floor(Math.random() * q.length));
    } else if (idx < q.length - 1) {
      playAtIndexRef.current(q, idx + 1);
    }
  }, []);

  const prev = useCallback(() => {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
    } else {
      const q = queueRef.current;
      const idx = idxRef.current;
      if (idx > 0) playAtIndexRef.current(q, idx - 1);
      else audio.currentTime = 0;
    }
  }, [audio]);

  const seek = useCallback((time) => { audio.currentTime = time; }, [audio]);

  const toggleShuffle = useCallback(() => setShuffle(s => !s), []);

  const cycleRepeat = useCallback(() =>
    setRepeat(r => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none'), []);

  const setDevice = useCallback(async (deviceId) => {
    setOutputDeviceId(deviceId);
    if (typeof audio.setSinkId === 'function') {
      await audio.setSinkId(deviceId).catch(console.error);
    }
  }, [audio]);

  return (
    <PlayerContext.Provider value={{
      currentTrack, currentPlaylistId,
      queue, queueIndex,
      isPlaying, currentTime, duration,
      shuffle, repeat, outputDeviceId,
      play, togglePlay, next, prev, seek,
      toggleShuffle, cycleRepeat, setDevice,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
