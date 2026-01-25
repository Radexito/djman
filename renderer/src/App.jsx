import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import MusicLibrary from './MusicLibrary.jsx';
import './App.css';

function App() {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('music');
  return (
    <>
      <Sidebar
        selectedMenuItemId={selectedPlaylistId}
        onMenuSelect={setSelectedPlaylistId}
      />
      <MusicLibrary 
        selectedPlaylist={selectedPlaylistId}
      />
    </>
  );
}

export default App;
