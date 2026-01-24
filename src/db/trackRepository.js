import db from './database.js';

// Create a new track
export function addTrack({ title, artist = '', album = '', duration = 0 }) {
  const stmt = db.prepare(`
    INSERT INTO tracks (title, artist, album, duration)
    VALUES (@title, @artist, @album, @duration)
  `);
  const info = stmt.run({ title, artist, album, duration });
  return info.lastInsertRowid;
}

// Read a track by ID
export function getTrack(id) {
  return db.prepare(`SELECT * FROM tracks WHERE id = ?`).get(id);
}

// Update a track
export function updateTrack(id, { title, artist, album, duration }) {
  const stmt = db.prepare(`
    UPDATE tracks
    SET title = @title,
        artist = @artist,
        album = @album,
        duration = @duration
    WHERE id = @id
  `);
  stmt.run({ id, title, artist, album, duration });
}

// Delete a track
export function deleteTrack(id) {
  const stmt = db.prepare(`DELETE FROM tracks WHERE id = ?`);
  stmt.run(id);
}

// Get all tracks (optionally ordered)
export function getAllTracks(orderBy = 'id') {
  return db.prepare(`SELECT * FROM tracks ORDER BY ${orderBy}`).all();
}
