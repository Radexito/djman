import { initDB } from './db/migrations.js';
import { addTrack, getAllTracks } from './db/trackRepository.js';
import { createPlaylist, addTrackToPlaylist, getPlaylistTracks } from './db/playlistRepository.js';

function runTest() {
  initDB();

  // Create a test playlist
  const playlistId = createPlaylist('My First Playlist');
  console.log('Created playlist ID:', playlistId);

  // Add fake tracks
  const track1 = addTrack({ title: 'Track One', artist: 'DJ Alpha', album: 'Album X', duration: 210 });
  const track2 = addTrack({ title: 'Track Two', artist: 'DJ Beta', album: 'Album Y', duration: 180 });

  console.log('Added tracks:', track1, track2);

  // Add tracks to playlist
  addTrackToPlaylist(playlistId, track1, 0);
  addTrackToPlaylist(playlistId, track2, 1);

  // Retrieve ordered tracks
  const playlistTracks = getPlaylistTracks(playlistId);
  console.log('Playlist tracks in order:');
  playlistTracks.forEach((t, i) => console.log(`${i + 1}. ${t.title} by ${t.artist}`));
}

runTest();
