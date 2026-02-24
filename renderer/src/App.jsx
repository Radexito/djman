import { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import MusicLibrary from './MusicLibrary.jsx';
import NormalizeModal from './SettingsModal.jsx';
import './App.css';

function App() {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('music');
  const [showNormalize, setShowNormalize] = useState(false);

  useEffect(() => {
    const unsub = window.api.onOpenNormalize(() => setShowNormalize(true));
    return unsub;
  }, []);

  return (
    <>
      <Sidebar
        selectedMenuItemId={selectedPlaylistId}
        onMenuSelect={setSelectedPlaylistId}
      />
      <MusicLibrary selectedPlaylist={selectedPlaylistId} />
      {showNormalize && <NormalizeModal onClose={() => setShowNormalize(false)} />}
    </>
  );
}

export default App;
