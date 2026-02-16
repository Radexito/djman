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
ipcMain.handle('update-track', async (event, id, data) => {
  try {
    updateTrack(id, data);
    return { success: true };
  } catch (error) {
    console.error('Failed to update track:', error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle('delete-track', async (event, id) => {
  try {
    await deleteTrack(id);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete track:', error);
    return { success: false, error: error.message };
  }
});

// Playlist operations
ipcMain.handle('get-playlists', async () => {
  try {
    return getAllPlaylists();
  } catch (error) {
    console.error('Failed to get playlists:', error);
    throw error;
  }
});
ipcMain.handle('create-playlist', async (event, name) => {
  try {
    return createPlaylist(name);
  } catch (error) {
    console.error('Failed to create playlist:', error);
    throw error;
  }
});
ipcMain.handle('delete-playlist', async (event, id) => {
  try {
    deletePlaylist(id);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete playlist:', error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle('add-track-to-playlist', async (event, playlistId, trackId, order) => {
  try {
    return addTrackToPlaylist(playlistId, trackId, order);
  } catch (error) {
    console.error('Failed to add track to playlist:', error);
    throw error;
  }
});
ipcMain.handle('get-playlist-tracks', async (event, playlistId) => {
  try {
    return getPlaylistTracks(playlistId);
  } catch (error) {
    console.error('Failed to get playlist tracks:', error);
    throw error;
  }
});
ipcMain.handle('remove-track-from-playlist', async (event, playlistId, trackId) => {
  try {
    removeTrackFromPlaylist(playlistId, trackId);
    return { success: true };
  } catch (error) {
    console.error('Failed to remove track from playlist:', error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle('update-track-order', async (event, playlistId, trackId, newOrder) => {
  try {
    updateTrackOrder(playlistId, trackId, newOrder);
    return { success: true };
  } catch (error) {
    console.error('Failed to update track order:', error);
    return { success: false, error: error.message };
  }
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
