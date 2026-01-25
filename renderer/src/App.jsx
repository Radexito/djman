import { useEffect, useState, useRef, useCallback } from 'react';
import './App.css';
import { FixedSizeList as List } from 'react-window';

const PAGE_SIZE = 50;
const ROW_HEIGHT = 60;

function App() {
  const [tracks, setTracks] = useState([]);
  const [search, setSearch] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [importProgress, setImportProgress] = useState({ total: 0, completed: 0 });

  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const listRef = useRef();

  // -------------------------------
  // Load tracks with paging
  // -------------------------------
  const loadTracks = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;

    const offset = offsetRef.current;

    const rows = await window.api.getTracks({
      limit: PAGE_SIZE,
      offset,
      search,
    });

    setTracks(prev => [...prev, ...rows]);
    offsetRef.current += rows.length;

    if (rows.length < PAGE_SIZE) setHasMore(false);

    loadingRef.current = false;
  }, [search, hasMore]);

  useEffect(() => {
    // Reset only on new search
    offsetRef.current = 0;
    setTracks([]);
    setHasMore(true);
    loadTracks();
  }, [search]);

  // -------------------------------
  // Import tracks with placeholders
  // -------------------------------
  const handleImport = async () => {
    const files = await window.api.selectAudioFiles();
    if (!files.length) return;

    setImportProgress({ total: files.length, completed: 0 });

    for (let i = 0; i < files.length; i++) {
      const trackIds = await window.api.importAudioFiles([files[i]]);
      if (!trackIds || !trackIds.length) continue;

      const placeholder = {
        id: trackIds[0],
        title: files[i].split('/').pop(),
        artist: '',
        bpm: null,
        key_camelot: null,
        energy: null,
        loudness: null,
        analyzed: 0,
      };

      // PREPEND placeholder **and keep scroll stable**
      if (listRef.current) {
        const scrollOffset = listRef.current.scrollOffset;
        setTracks(prev => [placeholder, ...prev]);
        listRef.current.scrollTo(scrollOffset + ROW_HEIGHT);
      } else {
        setTracks(prev => [placeholder, ...prev]);
      }

      setImportProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
    }

    setImportProgress({ total: 0, completed: 0 });
  };

  // -------------------------------
  // Track updates from analysis worker
  // -------------------------------
  useEffect(() => {
    const handler = ({ trackId, analysis }) => {
      setTracks(prev =>
        prev.map(t => t.id === trackId ? { ...t, ...analysis, analyzed: 1 } : t)
      );
    };
    window.api.onTrackUpdated(handler);
    return () => window.api.offTrackUpdated?.(handler);
  }, []);

  // -------------------------------
  // Row renderer
  // -------------------------------
  const Row = ({ index, style }) => {
    const t = tracks[index];
    if (!t) return null;

    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          borderBottom: '1px solid #333',
        }}
      >
        <div style={{ flex: 1 }}>
          {index + 1}. {t.title} — {t.artist || 'Unknown'}
          {t.bpm ? ` | ${t.bpm} BPM` : ' | BPM: ...'}
          {t.key_camelot ? ` | Key: ${t.key_camelot}` : ' | Key: ...'}
          {t.energy ? ` | Energy: ${t.energy}` : ' | Energy: ...'}
          {t.loudness ? ` | LUFS: ${t.loudness}` : ' | LUFS: ...'}
        </div>
        {!t.analyzed && <div style={{ marginLeft: 10 }}>🔄 Analyzing...</div>}
      </div>
    );
  };

  // -------------------------------
  // Infinite scroll using onItemsRendered
  // -------------------------------
  const handleItemsRendered = ({ visibleStopIndex }) => {
    if (!hasMore || loadingRef.current) return;
    if (visibleStopIndex >= tracks.length - 5) {
      loadTracks();
    }
  };

  return (
    <div className="App">
      <h1>🎧 Music Library</h1>

      <input
        placeholder="Search title / artist / album"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '60%', marginBottom: 12 }}
      />

      {importProgress.total > 0 && (
        <div style={{ marginBottom: 12 }}>
          Importing {importProgress.completed} / {importProgress.total}...
        </div>
      )}

      <List
        ref={listRef}
        height={600}
        itemCount={tracks.length}
        itemSize={ROW_HEIGHT}
        width="100%"
        onItemsRendered={handleItemsRendered}
      >
        {Row}
      </List>

      <button onClick={handleImport} style={{ marginTop: 12 }}>
        Import Audio Files
      </button>
    </div>
  );
}

export default App;
