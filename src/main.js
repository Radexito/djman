import path from 'path';
import { fileURLToPath } from 'url';
import { app, BrowserWindow, ipcMain } from 'electron';
import { initDB } from './db/migrations.js';
import { createPlaylist, addTrackToPlaylist, getPlaylistTracks } from './db/playlistRepository.js';
import { addTrack } from './db/trackRepository.js';

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

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer/dist/index.html'));
  }
}

async function initApp() {
  initDB();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

// IPC Handlers
ipcMain.handle('create-playlist', (event, name) => createPlaylist(name));
ipcMain.handle('add-track', (event, track) => addTrack(track));
ipcMain.handle('add-track-to-playlist', (event, playlistId, trackId, order) =>
  addTrackToPlaylist(playlistId, trackId, order)
);
ipcMain.handle('get-playlist-tracks', (event, playlistId) => getPlaylistTracks(playlistId));

app.on('ready', initApp);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
