import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newTrackTitle, setNewTrackTitle] = useState('');

  // Load playlists on mount
  useEffect(() => {
    // For now, just one playlist test
    async function init() {
      const playlistId = await window.api.createPlaylist('My First Playlist');
      setPlaylists([{ id: playlistId, name: 'My First Playlist' }]);
      setSelectedPlaylistId(playlistId);
    }

    init();
  }, []);

  // Load tracks whenever selected playlist changes
  useEffect(() => {
    async function loadTracks() {
      if (!selectedPlaylistId) return;
      const t = await window.api.getPlaylistTracks(selectedPlaylistId);
      setTracks(t);
    }

    loadTracks();
  }, [selectedPlaylistId]);

  const handleAddTrack = async () => {
  if (!newTrackTitle || !selectedPlaylistId) return;

  try {
    const trackId = await window.api.addTrack({
      title: newTrackTitle,
      artist: 'Unknown',
      album: 'Unknown',
      duration: 180,
    });

    await window.api.addTrackToPlaylist(selectedPlaylistId, trackId, tracks.length);
    const t = await window.api.getPlaylistTracks(selectedPlaylistId);
    setTracks(t);
    setNewTrackTitle('');
  } catch (err) {
    console.error('Failed to add track:', err);
    alert('Error adding track: see console');
  }
};


  return (
    <div className="App">
      <h1>DJ Library MVP</h1>

      <div>
        <h2>Playlists</h2>
        <ul>
          {playlists.map((p) => (
            <li
              key={p.id}
              style={{ cursor: 'pointer', fontWeight: p.id === selectedPlaylistId ? 'bold' : 'normal' }}
              onClick={() => setSelectedPlaylistId(p.id)}
            >
              {p.name}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2>Tracks</h2>
        <ul>
          {tracks.map((t, i) => (
            <li key={t.id}>
              {i + 1}. {t.title} — {t.artist} ({t.album})
            </li>
          ))}
        </ul>

        <input
          type="text"
          placeholder="New track title"
          value={newTrackTitle}
          onChange={(e) => setNewTrackTitle(e.target.value)}
        />
        <button onClick={handleAddTrack}>Add Track</button>
      </div>
    </div>
  );
}

export default App;
