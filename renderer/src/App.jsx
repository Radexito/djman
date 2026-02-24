import { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import MusicLibrary from './MusicLibrary.jsx';
import SettingsModal from './SettingsModal.jsx';
import './App.css';

function App() {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('music');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const unsub = window.api.onOpenSettings(() => setShowSettings(true));
    return unsub;
  }, []);

  return (
    <>
      <Sidebar
        selectedMenuItemId={selectedPlaylistId}
        onMenuSelect={setSelectedPlaylistId}
      />
      <MusicLibrary selectedPlaylist={selectedPlaylistId} />
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}

export default App;
