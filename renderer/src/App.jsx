import { useEffect, useState, useRef } from 'react';
import './App.css';

const PAGE_SIZE = 50;

function App() {
  console.log('Rendering App component');

  const [tracks, setTracks] = useState([]);
  const [hasMoreUI, setHasMoreUI] = useState(true);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  useEffect(() => {
    console.log('Search changed:', search);
    resetAndLoad();
  }, [search]);

  async function resetAndLoad() {
    console.log('Resetting and loading tracks');

    offsetRef.current = 0;
    loadingRef.current = false;
    hasMoreRef.current = true;

    setTracks([]);
    setHasMoreUI(true);

    await loadMore(true);
  }

  async function loadMore(reset = false) {
    console.log('Loading more tracks, reset:', reset);

    if (loadingRef.current || !hasMoreRef.current) {
      console.log('Blocked loadMore');
      return;
    }

    loadingRef.current = true;
    setIsLoading(true);

    const offset = reset ? 0 : offsetRef.current;

    const rows = await window.api.getTracks({
      limit: PAGE_SIZE,
      offset,
      search,
    });

    setTracks(prev => (reset ? rows : [...prev, ...rows]));

    offsetRef.current = offset + rows.length;

    if (rows.length < PAGE_SIZE) {
      hasMoreRef.current = false;
      setHasMoreUI(false);
    }

    loadingRef.current = false;
    setIsLoading(false);
  }

  const handleImport = async () => {
    console.log('Import button clicked');

    const files = await window.api.selectAudioFiles();
    if (!files.length) return;

    await window.api.importAudioFiles(files);
    await resetAndLoad();
  };

  return (
    <div className="App">
      <h1>🎧 Music</h1>

      <input
        placeholder="Search title / artist / album"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '60%', marginBottom: 12 }}
      />

      <ul
        style={{ maxHeight: '60vh', overflowY: 'auto' }}
        onScroll={e => {
          const el = e.target;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
            loadMore();
          }
        }}
      >
        {tracks.map((t, i) => (
          <li key={t.id}>
            {i + 1}. {t.title} — {t.artist || 'Unknown'}
            {t.bpm ? ` | ${t.bpm} BPM` : ' | BPM: ...'}
            {t.key_camelot ? ` | ${t.key_camelot}` : ' | Key: ...'}
            {t.energy ? ` | Energy: ${t.energy}` : ' | Energy: ...'}
            {t.loudness ? ` | LUFS: ${t.loudness}` : ' | LUFS: ...'}
          </li>
        ))}
      </ul>

      {isLoading && <p>Loading…</p>}

      <button onClick={handleImport}>Import Audio Files</button>
    </div>
  );
}

export default App;
