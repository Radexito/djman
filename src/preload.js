const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  createPlaylist: (name) => ipcRenderer.invoke('create-playlist', name),
  addTrack: (track) => ipcRenderer.invoke('add-track', track),
  addTrackToPlaylist: (playlistId, trackId, order) =>
    ipcRenderer.invoke('add-track-to-playlist', playlistId, trackId, order),
  getPlaylistTracks: (playlistId) => ipcRenderer.invoke('get-playlist-tracks', playlistId),
  selectAudioFiles: () => ipcRenderer.invoke('select-audio-files'),
  importAudioFiles: (files) => ipcRenderer.invoke('import-audio-files', files),
  onTrackUpdated: (callback) => ipcRenderer.on('track-updated', (event, data) => callback(data)),
  getTracks: (params) => ipcRenderer.invoke('get-tracks', params),
});
