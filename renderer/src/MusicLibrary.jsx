import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import './MusicLibrary.css';

const PAGE_SIZE = 50;
const ROW_HEIGHT = 50;
const PRELOAD_TRIGGER = 3;

function MusicLibrary({ selectedPlaylist }) {
  const [tracks, setTracks] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [contextMenu, setContextMenu] = useState(null); // { x, y, track }

  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const listRef = useRef();
  const sortedTracksRef = useRef([]);

  const columns = [
    { key: 'index', label: '#', width: '5%' },
    { key: 'title', label: 'Title', width: '30%' },
    { key: 'artist', label: 'Artist', width: '25%' },
    { key: 'bpm', label: 'BPM', width: '8%' },
    { key: 'key_camelot', label: 'Key', width: '8%' },
    { key: 'energy', label: 'Energy', width: '8%' },
    { key: 'loudness', label: 'Loudness', width: '8%' },
    { key: 'status', label: 'Status', width: '8%' },
  ];

  const [sortBy, setSortBy] = useState({ key: 'index', asc: true });

  const loadTracks = useCallback(async () => {
    if (loadingRef.current || !hasMore || isLoading) return;

    loadingRef.current = true;
    setIsLoading(true);

    try {
      const rows = await window.api.getTracks({
        limit: PAGE_SIZE,
        offset: offsetRef.current,
        search,
        playlistId: selectedPlaylist !== 'music' ? selectedPlaylist : undefined,
      });

      setTracks(prev => [...prev, ...rows]);
      offsetRef.current += rows.length;

      if (rows.length < PAGE_SIZE) setHasMore(false);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [search, selectedPlaylist, hasMore, isLoading]);

  const sortedTracks = useMemo(() => {
    const sorted = [...tracks].sort((a, b) => {
      if (sortBy.key === 'index') return 0;
      const va = a[sortBy.key] ?? '';
      const vb = b[sortBy.key] ?? '';
      if (typeof va === 'string') return sortBy.asc ? va.localeCompare(vb) : vb.localeCompare(va);
      if (typeof va === 'number') return sortBy.asc ? va - vb : vb - va;
      return 0;
    });
    sortedTracksRef.current = sorted;
    return sorted;
  }, [tracks, sortBy]);

  useEffect(() => {
    offsetRef.current = 0;
    setTracks([]);
    setHasMore(true);
    loadTracks();
  }, [search, selectedPlaylist]);

  // Listen for background analysis updates
  useEffect(() => {
    const unsub = window.api.onTrackUpdated(({ trackId, analysis }) => {
      setTracks(prev => prev.map(t =>
        t.id === trackId ? { ...t, ...analysis, analyzed: 1 } : t
      ));
    });
    return unsub;
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [contextMenu]);

  const handleContextMenu = useCallback((e, track) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, track });
  }, []);

  const handleReanalyze = useCallback(async (track) => {
    setContextMenu(null);
    setTracks(prev => prev.map(t => t.id === track.id ? { ...t, analyzed: 0 } : t));
    await window.api.reanalyzeTrack(track.id);
  }, []);

  const handleRemove = useCallback(async (track) => {
    setContextMenu(null);
    await window.api.removeTrack(track.id);
    setTracks(prev => prev.filter(t => t.id !== track.id));
    offsetRef.current = Math.max(0, offsetRef.current - 1);
  }, []);

  const handleItemsRendered = useCallback(({ visibleStopIndex }) => {
    if (
      visibleStopIndex >= sortedTracksRef.current.length - PRELOAD_TRIGGER &&
      hasMore &&
      !loadingRef.current
    ) {
      loadTracks();
    }
  }, [hasMore, loadTracks]);

  const handleSort = useCallback((key) => {
    setSortBy(prev => ({
      key,
      asc: prev.key === key ? !prev.asc : true,
    }));
  }, []);

  const Row = ({ index, style }) => {
    const t = sortedTracksRef.current[index];

    if (!t) {
      return (
        <div style={style} className="row row-loading">
          Loading more tracks...
        </div>
      );
    }

    return (
      <div
        style={style}
        className={`row ${index % 2 === 0 ? 'row-even' : 'row-odd'}`}
        title={`${t.title} - ${t.artist || 'Unknown'}`}
        onContextMenu={(e) => handleContextMenu(e, t)}
      >
        <div className="cell index">{index + 1}</div>
        <div className="cell title">{t.title}</div>
        <div className="cell artist">{t.artist || 'Unknown'}</div>
        <div className="cell numeric">{t.bpm ?? '...'}</div>
        <div className="cell numeric">{t.key_camelot ?? '...'}</div>
        <div className="cell numeric">{t.energy ?? '...'}</div>
        <div className="cell numeric">{t.loudness ?? '...'}</div>
        <div className="cell status">{t.analyzed ? '✅' : '🔄'}</div>
      </div>
    );
  };

  return (
    <div className="music-library">
      <input
        className="search-input"
        placeholder="Search title / artist / album"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="header">
        {columns.map(col => (
          <div
            key={col.key}
            className={`header-cell ${['bpm','key_camelot','energy','loudness','status'].includes(col.key) ? 'right' : ''}`}
            onClick={() => handleSort(col.key)}
          >
            {col.label} {sortBy.key === col.key ? (sortBy.asc ? '▲' : '▼') : ''}
          </div>
        ))}
      </div>

      <List
        ref={listRef}
        height={600}
        itemCount={sortedTracks.length + (hasMore ? 1 : 0)}
        itemSize={ROW_HEIGHT}
        width="100%"
        onItemsRendered={handleItemsRendered}
        className="track-list"
      >
        {Row}
      </List>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={() => handleReanalyze(contextMenu.track)}>
            🔄 Re-analyze
          </div>
          <div className="context-menu-item context-menu-item--danger" onClick={() => handleRemove(contextMenu.track)}>
            🗑️ Remove
          </div>
          <div className="context-menu-separator" />
          <div className="context-menu-item context-menu-item--disabled">
            ➕ Add to playlist
          </div>
        </div>
      )}
    </div>
  );
}

export default MusicLibrary;
