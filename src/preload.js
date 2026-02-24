const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  createPlaylist: (name) => ipcRenderer.invoke('create-playlist', name),
  addTrack: (track) => ipcRenderer.invoke('add-track', track),
  addTrackToPlaylist: (playlistId, trackId, order) =>
    ipcRenderer.invoke('add-track-to-playlist', playlistId, trackId, order),
  getPlaylistTracks: (playlistId) => ipcRenderer.invoke('get-playlist-tracks', playlistId),
  selectAudioFiles: () => ipcRenderer.invoke('select-audio-files'),
  importAudioFiles: (files) => ipcRenderer.invoke('import-audio-files', files),
  getTracks: (params) => ipcRenderer.invoke('get-tracks', params),
  getTrackIds: (params) => ipcRenderer.invoke('get-track-ids', params),
  getSetting: (key, def) => ipcRenderer.invoke('get-setting', key, def),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  normalizeLibrary: (payload) => ipcRenderer.invoke('normalize-library', payload),
  reanalyzeTrack: (trackId) => ipcRenderer.invoke('reanalyze-track', trackId),
  removeTrack: (trackId) => ipcRenderer.invoke('remove-track', trackId),
  adjustBpm: (payload) => ipcRenderer.invoke('adjust-bpm', payload),
  onTrackUpdated: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('track-updated', handler);
    return () => ipcRenderer.removeListener('track-updated', handler);
  },
  onLibraryUpdated: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('library-updated', handler);
    return () => ipcRenderer.removeListener('library-updated', handler);
  },
  onOpenSettings: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('open-settings', handler);
    return () => ipcRenderer.removeListener('open-settings', handler);
  },
});
