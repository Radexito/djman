import path from 'path';
import { fileURLToPath } from 'url';
import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import { initDB } from './db/migrations.js';
// import { createPlaylist, addTrackToPlaylist, getPlaylistTracks } from './db/playlistRepository.js';
import { addTrack, getTracks, getTrackIds, getTrackById, removeTrack, updateTrack, normalizeLibrary } from './db/trackRepository.js';
import { getSetting, setSetting } from './db/settingsRepository.js';
import { importAudioFile, spawnAnalysis } from './audio/importManager.js';

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

  // Application menu
  const menu = Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            if (global.mainWindow) global.mainWindow.webContents.send('open-settings');
          },
        },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

// IPC Handlers
ipcMain.handle('get-tracks', (_, params) => getTracks(params));
ipcMain.handle('get-track-ids', (_, params) => getTrackIds(params));
ipcMain.handle('get-setting', (_, key, def) => getSetting(key, def));
ipcMain.handle('set-setting', (_, key, value) => setSetting(key, value));
ipcMain.handle('normalize-library', (_, { targetLufs }) => {
  const parsed = Number(targetLufs);
  if (!Number.isFinite(parsed) || parsed < -60 || parsed > 0) {
    throw new Error(`Invalid targetLufs: must be a finite number between -60 and 0`);
  }
  const updated = normalizeLibrary(parsed);
  setSetting('normalize_target_lufs', String(parsed));
  return { updated };
});
ipcMain.handle('reanalyze-track', (_, trackId) => {
  const track = getTrackById(trackId);
  if (!track) throw new Error(`Track ${trackId} not found`);
  spawnAnalysis(trackId, track.file_path);
  return { ok: true };
});
ipcMain.handle('remove-track', (_, trackId) => {
  removeTrack(trackId);
  return { ok: true };
});
ipcMain.handle('adjust-bpm', (_, { trackIds, factor }) => {
  if (factor !== 2 && factor !== 0.5) throw new Error('Invalid factor: must be 2 or 0.5');
  if (!Array.isArray(trackIds) || trackIds.length === 0 || trackIds.length > 500) {
    throw new Error('Invalid trackIds: must be a non-empty array of up to 500 IDs');
  }
  const results = [];
  for (const id of trackIds) {
    const track = getTrackById(id);
    if (!track) continue;
    const base = track.bpm_override ?? track.bpm;
    if (base == null) continue;
    const newBpm = Math.round(base * factor * 10) / 10;
    updateTrack(id, { bpm_override: newBpm });
    results.push({ id, bpm_override: newBpm });
  }
  return results;
});
// ipcMain.handle('create-playlist', (event, name) => createPlaylist(name));
ipcMain.handle('add-track', (event, track) => addTrack(track));
// ipcMain.handle('add-track-to-playlist', (event, playlistId, trackId, order) =>
//   addTrackToPlaylist(playlistId, trackId, order)
// );
// ipcMain.handle('get-playlist-tracks', (event, playlistId) => getPlaylistTracks(playlistId));
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

  if (trackIds.length > 0 && global.mainWindow) {
    global.mainWindow.webContents.send('library-updated');
  }

  return trackIds;
});

app.on('ready', initApp);
app.on('window-all-closed', () => {
  console.log('All windows closed.');
  if (process.platform !== 'darwin') app.quit();
});
