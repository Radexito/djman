const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Track operations
  getTracks: (params) => ipcRenderer.invoke('get-tracks', params),
  addTrack: (track) => ipcRenderer.invoke('add-track', track),
  updateTrack: (id, data) => ipcRenderer.invoke('update-track', id, data),
  deleteTrack: (id) => ipcRenderer.invoke('delete-track', id),
  
  // Playlist operations
  getPlaylists: () => ipcRenderer.invoke('get-playlists'),
  createPlaylist: (name) => ipcRenderer.invoke('create-playlist', name),
  deletePlaylist: (id) => ipcRenderer.invoke('delete-playlist', id),
  addTrackToPlaylist: (playlistId, trackId, order) =>
    ipcRenderer.invoke('add-track-to-playlist', playlistId, trackId, order),
  getPlaylistTracks: (playlistId) => ipcRenderer.invoke('get-playlist-tracks', playlistId),
  removeTrackFromPlaylist: (playlistId, trackId) =>
    ipcRenderer.invoke('remove-track-from-playlist', playlistId, trackId),
  updateTrackOrder: (playlistId, trackId, newOrder) =>
    ipcRenderer.invoke('update-track-order', playlistId, trackId, newOrder),
  
  // File operations
  selectAudioFiles: () => ipcRenderer.invoke('select-audio-files'),
  importAudioFiles: (files) => ipcRenderer.invoke('import-audio-files', files),
  
  // Events
  onTrackUpdated: (callback) => ipcRenderer.on('track-updated', (event, data) => callback(data)),
});
