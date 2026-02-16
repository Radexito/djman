import { useState, useEffect } from 'react';
import './Sidebar.css';

const musicItems = [
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'radio', name: 'Radio', icon: '📻' },
  { id: 'download', name: 'Download', icon: '🔍' },
];

function Sidebar({ selectedMenuItemId, onMenuSelect }) {
  const [importProgress, setImportProgress] = useState({ total: 0, completed: 0 });
  const [playlists, setPlaylists] = useState([]);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // Load playlists on mount
  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const loadedPlaylists = await window.api.getPlaylists();
      setPlaylists(loadedPlaylists);
    } catch (error) {
      console.error('Failed to load playlists:', error);
    }
  };

  const handleImport = async () => {
    const files = await window.api.selectAudioFiles();
    if (!files.length) return;

    setImportProgress({ total: files.length, completed: 0 });

    for (let i = 0; i < files.length; i++) {
      const trackIds = await window.api.importAudioFiles([files[i]]);
      if (!trackIds || !trackIds.length) continue;

      setImportProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
    }

    setImportProgress({ total: 0, completed: 0 });
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    
    try {
      await window.api.createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreatingPlaylist(false);
      await loadPlaylists();
    } catch (error) {
      console.error('Failed to create playlist:', error);
      alert('Failed to create playlist');
    }
  };

  const handleDeletePlaylist = async (playlistId, playlistName, e) => {
    e.stopPropagation();
    
    if (!confirm(`Delete playlist "${playlistName}"?`)) return;
    
    try {
      await window.api.deletePlaylist(playlistId);
      await loadPlaylists();
      
      // If deleted playlist was selected, switch to Music
      if (selectedMenuItemId === playlistId) {
        onMenuSelect('music');
      }
    } catch (error) {
      console.error('Failed to delete playlist:', error);
      alert('Failed to delete playlist');
    }
  };

  const renderMenuSection = (items, sectionTitle, scrollable = false) => (
    <div className={`menu-section ${scrollable ? 'scrollable' : ''}`}>
      {items.length > 0 && (
        <>
          {sectionTitle && (
            <div className="section-title">{sectionTitle}</div>
          )}
          {items.map(item => (
            <div
              key={item.id}
              className={`menu-item ${selectedMenuItemId === item.id ? 'active' : ''}`}
              onClick={() => onMenuSelect(item.id)}
            >
              {item.icon && <span className="menu-icon">{item.icon}</span>}
              <span className="menu-text">{item.name}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );

  return (
    <div className="sidebar">
      {/* Fixed top section */}
      <div className="fixed-top-section">
        {renderMenuSection(musicItems, null, false)}
        <div className="menu-separator"></div>
      </div>

      {/* Scrollable playlists */}
      <div className="scrollable-playlists">
        <div className="menu-section scrollable">
          <div className="section-title">
            PLAYLISTS
            <button 
              className="add-playlist-btn"
              onClick={() => setIsCreatingPlaylist(true)}
              title="Create new playlist"
            >
              +
            </button>
          </div>
          
          {isCreatingPlaylist && (
            <div className="create-playlist-form">
              <input
                type="text"
                placeholder="Playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreatePlaylist();
                  if (e.key === 'Escape') {
                    setIsCreatingPlaylist(false);
                    setNewPlaylistName('');
                  }
                }}
                autoFocus
              />
              <div className="form-buttons">
                <button onClick={handleCreatePlaylist}>Create</button>
                <button onClick={() => {
                  setIsCreatingPlaylist(false);
                  setNewPlaylistName('');
                }}>Cancel</button>
              </div>
            </div>
          )}
          
          {playlists.map(playlist => (
            <div
              key={playlist.id}
              className={`menu-item ${selectedMenuItemId === playlist.id ? 'active' : ''}`}
              onClick={() => onMenuSelect(playlist.id)}
            >
              <span className="menu-icon">📁</span>
              <span className="menu-text">{playlist.name}</span>
              <button
                className="delete-playlist-btn"
                onClick={(e) => handleDeletePlaylist(playlist.id, playlist.name, e)}
                title="Delete playlist"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed bottom section - ALWAYS stays at bottom */}
      <div className="fixed-bottom-section">
        {importProgress.total > 0 && (
          <div className="import-progress">
            Importing {importProgress.completed} / {importProgress.total}...
          </div>
        )}
        <button
          className="import-button"
          onClick={handleImport}
        >
          Import Audio Files
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
