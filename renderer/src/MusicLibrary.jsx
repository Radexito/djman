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
  const [editingTrack, setEditingTrack] = useState(null);
  const [editedData, setEditedData] = useState({});

  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const listRef = useRef();
  const sortedTracksRef = useRef([]);

  const columns = [
    { key: 'index', label: '#', width: '4%' },
    { key: 'title', label: 'Title', width: '22%' },
    { key: 'artist', label: 'Artist', width: '18%' },
    { key: 'rating', label: '★', width: '8%' },
    { key: 'bpm', label: 'BPM', width: '7%' },
    { key: 'key_camelot', label: 'Key', width: '7%' },
    { key: 'energy', label: 'Energy', width: '7%' },
    { key: 'loudness', label: 'Loud', width: '7%' },
    { key: 'comments', label: 'Notes', width: '15%' },
    { key: 'actions', label: '', width: '5%' },
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

  const handleEditStart = (track) => {
    setEditingTrack(track.id);
    setEditedData({
      title: track.title,
      artist: track.artist || '',
      rating: track.rating || 0,
      comments: track.comments || '',
    });
  };

  const handleEditSave = async (trackId) => {
    try {
      const result = await window.api.updateTrack(trackId, editedData);
      
      if (result.success) {
        // Update local state
        setTracks(prev => prev.map(t => 
          t.id === trackId ? { ...t, ...editedData } : t
        ));
        
        setEditingTrack(null);
        setEditedData({});
      } else {
        console.error('Failed to update track:', result.error);
        alert(`Failed to update track: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to update track:', error);
      alert('Failed to update track');
    }
  };

  const handleEditCancel = () => {
    setEditingTrack(null);
    setEditedData({});
  };

  const handleDelete = async (track) => {
    if (!confirm(`Delete "${track.title}" from library?`)) return;
    
    try {
      await window.api.deleteTrack(track.id);
      
      // Remove from local state
      setTracks(prev => prev.filter(t => t.id !== track.id));
    } catch (error) {
      console.error('Failed to delete track:', error);
      alert('Failed to delete track');
    }
  };

  const StarRating = ({ rating, onRate, editable }) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''} ${editable ? 'editable' : ''}`}
            onClick={() => editable && onRate(star)}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const Row = ({ index, style }) => {
    const t = sortedTracksRef.current[index];

    if (!t) {
      return (
        <div style={style} className="row row-loading">
          Loading more tracks...
        </div>
      );
    }

    const isEditing = editingTrack === t.id;

    return (
      <div
        style={style}
        className={`row ${index % 2 === 0 ? 'row-even' : 'row-odd'} ${isEditing ? 'row-editing' : ''}`}
      >
        <div className="cell index">{index + 1}</div>
        
        {/* Title */}
        {isEditing ? (
          <input
            className="cell-edit"
            value={editedData.title}
            onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
            placeholder="Title"
          />
        ) : (
          <div className="cell title" onDoubleClick={() => handleEditStart(t)}>
            {t.title}
          </div>
        )}
        
        {/* Artist */}
        {isEditing ? (
          <input
            className="cell-edit"
            value={editedData.artist}
            onChange={(e) => setEditedData({ ...editedData, artist: e.target.value })}
            placeholder="Artist"
          />
        ) : (
          <div className="cell artist" onDoubleClick={() => handleEditStart(t)}>
            {t.artist || 'Unknown'}
          </div>
        )}
        
        {/* Rating */}
        <div className="cell rating">
          {isEditing ? (
            <StarRating
              rating={editedData.rating}
              onRate={(r) => setEditedData({ ...editedData, rating: r })}
              editable
            />
          ) : (
            <StarRating
              rating={t.rating || 0}
              onRate={async (r) => {
                try {
                  const result = await window.api.updateTrack(t.id, { rating: r });
                  if (result.success) {
                    setTracks(prev => prev.map(track => 
                      track.id === t.id ? { ...track, rating: r } : track
                    ));
                  } else {
                    console.error('Failed to update rating:', result.error);
                    alert('Failed to update rating');
                  }
                } catch (error) {
                  console.error('Failed to update rating:', error);
                  alert('Failed to update rating');
                }
              }}
              editable
            />
          )}
        </div>
        
        <div className="cell numeric">{t.bpm ?? '...'}</div>
        <div className="cell numeric">{t.key_camelot ?? '...'}</div>
        <div className="cell numeric">{t.energy ?? '...'}</div>
        <div className="cell numeric">{t.loudness ?? '...'}</div>
        
        {/* Comments */}
        {isEditing ? (
          <input
            className="cell-edit"
            value={editedData.comments}
            onChange={(e) => setEditedData({ ...editedData, comments: e.target.value })}
            placeholder="Notes"
          />
        ) : (
          <div className="cell comments" onDoubleClick={() => handleEditStart(t)}>
            {t.comments || ''}
          </div>
        )}
        
        {/* Actions */}
        <div className="cell actions">
          {isEditing ? (
            <div className="edit-actions">
              <button className="save-btn" onClick={() => handleEditSave(t.id)}>✓</button>
              <button className="cancel-btn" onClick={handleEditCancel}>✕</button>
            </div>
          ) : (
            <button className="delete-btn" onClick={() => handleDelete(t)} title="Delete track">
              🗑
            </button>
          )}
        </div>
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
            className={`header-cell ${['rating','bpm','key_camelot','energy','loudness'].includes(col.key) ? 'right' : ''}`}
            onClick={() => col.key !== 'actions' && handleSort(col.key)}
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
    </div>
  );
}

export default MusicLibrary;
