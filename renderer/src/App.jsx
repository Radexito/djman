import { useEffect, useState, useRef, useCallback } from 'react';
import './App.css';
import { FixedSizeList as List } from 'react-window';

const PAGE_SIZE = 50;
const ROW_HEIGHT = 50;

function App() {
  const [tracks, setTracks] = useState([]);
  const [search, setSearch] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [importProgress, setImportProgress] = useState({ total: 0, completed: 0 });
  const [selectedPlaylist, setSelectedPlaylist] = useState('music');
  const [sortBy, setSortBy] = useState({ key: 'index', asc: true });

  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const listRef = useRef();

  const playlists = [
    { id: 'music', name: 'Music' },
    { id: 'pl1', name: 'Playlist 1' },
    { id: 'pl2', name: 'Playlist 2' },
    { id: 'pl3', name: 'Playlist 3' },
  ];

  const loadTracks = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;

    const offset = offsetRef.current;

    const rows = await window.api.getTracks({
      limit: PAGE_SIZE,
      offset,
      search,
      playlistId: selectedPlaylist !== 'music' ? selectedPlaylist : undefined,
    });

    setTracks(prev => [...prev, ...rows]);
    offsetRef.current += rows.length;

    if (rows.length < PAGE_SIZE) setHasMore(false);
    loadingRef.current = false;
  }, [search, hasMore, selectedPlaylist]);

  useEffect(() => {
    offsetRef.current = 0;
    setTracks([]);
    setHasMore(true);
    loadTracks();
  }, [search, selectedPlaylist]);

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

  useEffect(() => {
    const handler = ({ trackId, analysis }) => {
      setTracks(prev =>
        prev.map(t => t.id === trackId ? { ...t, ...analysis, analyzed: 1 } : t)
      );
    };
    window.api.onTrackUpdated(handler);
    return () => window.api.offTrackUpdated?.(handler);
  }, []);

  // Sorting
  const handleSort = key => {
    setSortBy(prev => ({
      key,
      asc: prev.key === key ? !prev.asc : true,
    }));
  };

  const sortedTracks = [...tracks].sort((a, b) => {
    if (sortBy.key === 'index') return 0;
    const va = a[sortBy.key] ?? '';
    const vb = b[sortBy.key] ?? '';
    if (typeof va === 'string') return sortBy.asc ? va.localeCompare(vb) : vb.localeCompare(va);
    if (typeof va === 'number') return sortBy.asc ? va - vb : vb - va;
    return 0;
  });

  const columns = [
    { key: 'index', label: '#' },
    { key: 'title', label: 'Title', width: 250 },
    { key: 'artist', label: 'Artist', width: 200 },
    { key: 'bpm', label: 'BPM', width: 60 },
    { key: 'key_camelot', label: 'Key', width: 60 },
    { key: 'energy', label: 'Energy', width: 60 },
    { key: 'loudness', label: 'Loudness', width: 80 },
    { key: 'status', label: 'Status', width: 80 },
  ];

  const Row = ({ index, style }) => {
    const t = sortedTracks[index];
    if (!t) return null;

    return (
      <tr style={{ ...style, display: 'table', tableLayout: 'fixed', width: '100%' }}>
        <td style={{ padding: '0 8px' }}>{index + 1}</td>
        <td style={{ padding: '0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.title}>{t.title}</td>
        <td style={{ padding: '0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.artist || 'Unknown'}>{t.artist || 'Unknown'}</td>
        <td style={{ padding: '0 8px', textAlign: 'right' }}>{t.bpm ?? '...'}</td>
        <td style={{ padding: '0 8px', textAlign: 'right' }}>{t.key_camelot ?? '...'}</td>
        <td style={{ padding: '0 8px', textAlign: 'right' }}>{t.energy ?? '...'}</td>
        <td style={{ padding: '0 8px', textAlign: 'right' }}>{t.loudness ?? '...'}</td>
        <td style={{ padding: '0 8px', textAlign: 'center' }}>{t.analyzed ? '✅' : '🔄'}</td>
      </tr>
    );
  };

  const handleItemsRendered = ({ visibleStopIndex }) => {
    if (!hasMore || loadingRef.current) return;
    if (visibleStopIndex >= sortedTracks.length - 5) loadTracks();
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: 220,
        backgroundColor: '#111',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        padding: 12,
        justifyContent: 'space-between',
      }}>
        <div>
          <input
            placeholder="Search title / artist / album"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', marginBottom: 20 }}
          />
          {playlists.map(pl => (
            <div
              key={pl.id}
              style={{
                padding: '8px 12px',
                marginBottom: 4,
                cursor: 'pointer',
                backgroundColor: selectedPlaylist === pl.id ? '#333' : 'transparent',
                borderRadius: 4
              }}
              onClick={() => setSelectedPlaylist(pl.id)}
            >
              {pl.name}
            </div>
          ))}
        </div>

        <button
          onClick={handleImport}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '10px 0',
            borderRadius: 4,
            backgroundColor: '#1db954',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Import Audio Files
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {importProgress.total > 0 && (
          <div style={{ marginBottom: 12 }}>
            Importing {importProgress.completed} / {importProgress.total}...
          </div>
        )}

        {/* Table headers */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  style={{
                    textAlign: ['bpm', 'key_camelot', 'energy', 'loudness'].includes(col.key) ? 'right' : 'left',
                    padding: '0 8px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    width: col.width
                  }}
                  onClick={() => handleSort(col.key)}
                  title={`Sort by ${col.label}`}
                >
                  {col.label} {sortBy.key === col.key ? (sortBy.asc ? '▲' : '▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
        </table>

        <List
          ref={listRef}
          height={600}
          itemCount={sortedTracks.length}
          itemSize={ROW_HEIGHT}
          width="100%"
          onItemsRendered={handleItemsRendered}
          style={{ overflowX: 'hidden' }}
        >
          {({ index, style }) => (
            <table style={{ width: '100%', borderCollapse: 'collapse', ...style }}>
              <tbody>
                <Row index={index} style={{}} />
              </tbody>
            </table>
          )}
        </List>
      </div>
    </div>
  );
}

export default App;
