import path from 'path';
import { fileURLToPath } from 'url';
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { initDB } from './db/migrations.js';
import db from './db/database.js';
import { 
  createPlaylist, 
  deletePlaylist, 
  getPlaylist,
  getAllPlaylists,
  addTrackToPlaylist, 
  getPlaylistTracks,
  removeTrackFromPlaylist,
  updateTrackOrder 
} from './db/playlistRepository.js';
import { addTrack, getTracks, updateTrack, deleteTrack } from './db/trackRepository.js';
import { importAudioFile } from './audio/importManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  global.mainWindow = mainWindow; // make accessible to workers

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer/dist/index.html'));
  }
}

async function initApp() {
  console.log('Initializing database...');
  initDB();
  console.log('Creating window.');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

// IPC Handlers

// Track operations
ipcMain.handle('get-tracks', (_, params) => getTracks(params));
ipcMain.handle('add-track', (event, track) => addTrack(track));
ipcMain.handle('update-track', (event, id, data) => {
  updateTrack(id, data);
  return true;
});
ipcMain.handle('delete-track', async (event, id) => {
  try {
    await deleteTrack(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Playlist operations
ipcMain.handle('get-playlists', async () => {
  return getAllPlaylists();
});
ipcMain.handle('create-playlist', (event, name) => createPlaylist(name));
ipcMain.handle('delete-playlist', (event, id) => {
  deletePlaylist(id);
  return true;
});
ipcMain.handle('add-track-to-playlist', (event, playlistId, trackId, order) =>
  addTrackToPlaylist(playlistId, trackId, order)
);
ipcMain.handle('get-playlist-tracks', (event, playlistId) => getPlaylistTracks(playlistId));
ipcMain.handle('remove-track-from-playlist', (event, playlistId, trackId) => {
  removeTrackFromPlaylist(playlistId, trackId);
  return true;
});
ipcMain.handle('update-track-order', (event, playlistId, trackId, newOrder) => {
  updateTrackOrder(playlistId, trackId, newOrder);
  return true;
});

// File operations
ipcMain.handle('select-audio-files', async () => {
  console.log('Selecting audio files');
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio', extensions: ['mp3', 'flac', 'wav', 'm4a'] },
    ],
  });

  return result.canceled ? [] : result.filePaths;
});
ipcMain.handle('import-audio-files', async (event, filePaths) => {
  console.log('Importing audio files:', filePaths);
  const trackIds = [];

  for (const filePath of filePaths) {
    try {
      const trackId = await importAudioFile(filePath);
      trackIds.push(trackId);
    } catch (err) {
      console.error('Import failed:', filePath, err);
    }
  }

  return trackIds;
});

app.on('ready', initApp);
app.on('window-all-closed', () => {
  console.log('All windows closed.');
  if (process.platform !== 'darwin') app.quit();
});
