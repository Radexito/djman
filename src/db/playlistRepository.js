// src/db/playlistRepository.js
import db from './database.js';

// Get all playlists
export function getAllPlaylists() {
  return db.prepare(`SELECT * FROM playlists ORDER BY name`).all();
}

// Create a new playlist
export function createPlaylist(name) {
  const stmt = db.prepare(`INSERT INTO playlists (name) VALUES (?)`);
  return stmt.run(name).lastInsertRowid;
}

// Get playlist info
export function getPlaylist(id) {
  return db.prepare(`SELECT * FROM playlists WHERE id = ?`).get(id);
}

// Delete playlist
export function deletePlaylist(id) {
  db.prepare(`DELETE FROM playlists WHERE id = ?`).run(id);
}

// Add track to playlist with specific order
export function addTrackToPlaylist(playlistId, trackId, trackOrder) {
  db.prepare(`
    INSERT INTO playlist_tracks (playlist_id, track_id, track_order)
    VALUES (?, ?, ?)
  `).run(playlistId, trackId, trackOrder);
}

// Get tracks in a playlist, ordered by track_order
export function getPlaylistTracks(playlistId) {
  return db.prepare(`
    SELECT t.*
    FROM playlist_tracks pt
    JOIN tracks t ON t.id = pt.track_id
    WHERE pt.playlist_id = ?
    ORDER BY pt.track_order ASC
  `).all(playlistId);
}

// Update track order in a playlist
export function updateTrackOrder(playlistId, trackId, newOrder) {
  db.prepare(`
    UPDATE playlist_tracks
    SET track_order = ?
    WHERE playlist_id = ? AND track_id = ?
  `).run(newOrder, playlistId, trackId);
}

// Remove track from playlist
export function removeTrackFromPlaylist(playlistId, trackId) {
  db.prepare(`
    DELETE FROM playlist_tracks
    WHERE playlist_id = ? AND track_id = ?
  `).run(playlistId, trackId);
}
