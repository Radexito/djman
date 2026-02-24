import { useState } from 'react';
import './Sidebar.css';

const musicItems = [
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'radio', name: 'Radio', icon: '📻' },
  { id: 'download', name: 'Download', icon: '🔍' },
];

const playlistItems = Array.from({ length: 45 }, (_, i) => ({
  id: `pl${i + 1}`,
  name: `Playlist ${i + 1}`,
}));

function Sidebar({ selectedMenuItemId, onMenuSelect }) {
  const [importProgress, setImportProgress] = useState({ total: 0, completed: 0 });

  const handleImport = async () => {
    const files = await window.api.selectAudioFiles();
    if (!files.length) return;

    setImportProgress({ total: files.length, completed: 0 });
    await window.api.importAudioFiles(files);
    setImportProgress({ total: 0, completed: 0 });
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
        {renderMenuSection(playlistItems, 'PLAYLISTS', true)}
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
