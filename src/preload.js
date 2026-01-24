// preload.js (CommonJS)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  createPlaylist: (name) => ipcRenderer.invoke('create-playlist', name),
  addTrack: (track) => ipcRenderer.invoke('add-track', track),
  addTrackToPlaylist: (playlistId, trackId, order) =>
    ipcRenderer.invoke('add-track-to-playlist', playlistId, trackId, order),
  getPlaylistTracks: (playlistId) => ipcRenderer.invoke('get-playlist-tracks', playlistId),
});

console.log('Preload loaded'); // sanity check
