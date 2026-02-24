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
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null); // { x, y, targetIds }
  const [loadKey, setLoadKey] = useState(0);

  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const listRef = useRef();
  const sortedTracksRef = useRef([]);
  const lastSelectedIndexRef = useRef(null);

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
    loadingRef.current = false;
    setTracks([]);
    setHasMore(true);
    setSelectedIds(new Set());
    lastSelectedIndexRef.current = null;
    loadTracks();
  }, [search, selectedPlaylist, loadKey]);

  // Listen for background analysis updates
  useEffect(() => {
    const unsub = window.api.onTrackUpdated(({ trackId, analysis }) => {
      setTracks(prev => prev.map(t =>
        t.id === trackId ? { ...t, ...analysis, analyzed: 1 } : t
      ));
    });
    return unsub;
  }, []);

  // Refresh list when new tracks are imported
  useEffect(() => {
    const unsub = window.api.onLibraryUpdated(() => setLoadKey(k => k + 1));
    return unsub;
  }, []);

  // Ctrl+A — select all tracks including unloaded ones
  useEffect(() => {
    const onKeyDown = async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const ids = await window.api.getTrackIds({
          search,
          playlistId: selectedPlaylist !== 'music' ? selectedPlaylist : undefined,
        });
        setSelectedIds(new Set(ids));
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [search, selectedPlaylist]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [contextMenu]);

  // ── Selection ──────────────────────────────────────────────────────────────

  const handleRowClick = useCallback((e, track, index) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(track.id)) next.delete(track.id);
        else next.add(track.id);
        return next;
      });
      lastSelectedIndexRef.current = index;
    } else if (e.shiftKey && lastSelectedIndexRef.current !== null) {
      const start = Math.min(lastSelectedIndexRef.current, index);
      const end   = Math.max(lastSelectedIndexRef.current, index);
      const rangeIds = sortedTracksRef.current.slice(start, end + 1).map(t => t.id);
      setSelectedIds(new Set(rangeIds));
    } else {
      setSelectedIds(new Set([track.id]));
      lastSelectedIndexRef.current = index;
    }
  }, []);

  // ── Context menu ───────────────────────────────────────────────────────────

  const handleContextMenu = useCallback((e, track, index) => {
    e.preventDefault();
    // If right-clicked track is already selected, menu targets all selected
    // Otherwise, select only this track
    if (!selectedIds.has(track.id)) {
      setSelectedIds(new Set([track.id]));
      lastSelectedIndexRef.current = index;
    }
    const targetIds = selectedIds.has(track.id) ? [...selectedIds] : [track.id];
    setContextMenu({ x: e.clientX, y: e.clientY, targetIds });
  }, [selectedIds]);

  const handleReanalyze = useCallback(async () => {
    const targetIds = contextMenu?.targetIds ?? [];
    setContextMenu(null);
    setTracks(prev => prev.map(t =>
      targetIds.includes(t.id) ? { ...t, analyzed: 0 } : t
    ));
    for (const id of targetIds) await window.api.reanalyzeTrack(id);
  }, [contextMenu]);

  const handleRemove = useCallback(async () => {
    const targetIds = contextMenu?.targetIds ?? [];
    setContextMenu(null);
    for (const id of targetIds) await window.api.removeTrack(id);
    setTracks(prev => prev.filter(t => !targetIds.includes(t.id)));
    setSelectedIds(new Set());
    offsetRef.current = Math.max(0, offsetRef.current - targetIds.length);
  }, [contextMenu]);

  const handleBpmAdjust = useCallback(async (factor) => {
    const targetIds = contextMenu?.targetIds ?? [];
    setContextMenu(null);
    if (!targetIds.length) return;

    // Optimistic update
    setTracks(prev => prev.map(t => {
      if (!targetIds.includes(t.id)) return t;
      const base = t.bpm_override ?? t.bpm;
      if (base == null) return t;
      return { ...t, bpm_override: Math.round(base * factor * 10) / 10 };
    }));

    // Persist to DB and reconcile with returned values
    const updated = await window.api.adjustBpm({ trackIds: targetIds, factor });
    setTracks(prev => prev.map(t => {
      const u = updated.find(r => r.id === t.id);
      return u ? { ...t, bpm_override: u.bpm_override } : t;
    }));
  }, [contextMenu]);

  // ── Misc ───────────────────────────────────────────────────────────────────

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

  // ── Row ────────────────────────────────────────────────────────────────────

  const Row = ({ index, style }) => {
    const t = sortedTracksRef.current[index];

    if (!t) {
      return (
        <div style={style} className="row row-loading">
          Loading more tracks...
        </div>
      );
    }

    const isSelected = selectedIds.has(t.id);
    const bpmValue   = t.bpm_override ?? t.bpm;

    return (
      <div
        style={style}
        className={`row ${index % 2 === 0 ? 'row-even' : 'row-odd'}${isSelected ? ' row--selected' : ''}`}
        title={`${t.title} - ${t.artist || 'Unknown'}`}
        onClick={(e) => handleRowClick(e, t, index)}
        onContextMenu={(e) => handleContextMenu(e, t, index)}
      >
        <div className="cell index">{index + 1}</div>
        <div className="cell title">{t.title}</div>
        <div className="cell artist">{t.artist || 'Unknown'}</div>
        <div className={`cell numeric${t.bpm_override != null ? ' bpm--overridden' : ''}`}>
          {bpmValue ?? '...'}
        </div>
        <div className="cell numeric">{t.key_camelot ?? '...'}</div>
        <div className="cell numeric">{t.energy ?? '...'}</div>
        <div className="cell numeric">{t.loudness ?? '...'}</div>
        <div className="cell status">{t.analyzed ? '✅' : '🔄'}</div>
      </div>
    );
  };

  const selectionLabel = contextMenu?.targetIds?.length > 1
    ? ` (${contextMenu.targetIds.length} tracks)`
    : '';

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
          <div className="context-menu-item" onClick={handleReanalyze}>
            🔄 Re-analyze{selectionLabel}
          </div>
          <div className="context-menu-item context-menu-item--has-submenu">
            🎵 BPM{selectionLabel}
            <div className="context-submenu">
              <div className="context-menu-item" onClick={() => handleBpmAdjust(2)}>
                ✕2 Double BPM
              </div>
              <div className="context-menu-item" onClick={() => handleBpmAdjust(0.5)}>
                ÷2 Halve BPM
              </div>
            </div>
          </div>
          <div className="context-menu-item context-menu-item--danger" onClick={handleRemove}>
            🗑️ Remove{selectionLabel}
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

