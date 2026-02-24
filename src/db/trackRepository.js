// src/db/trackRepository.js
import db from './database.js';

export function addTrack(track) {
  console.log('Adding track:', track);
  const stmt = db.prepare(`
    INSERT INTO tracks (
      title, artist, album, duration,
      file_path, file_hash, format, bitrate,
      created_at
    ) VALUES (
      @title, @artist, @album, @duration,
      @file_path, @file_hash, @format, @bitrate,
      @created_at
    )
  `);

  const info = stmt.run({
    title: track.title,
    artist: track.artist ?? '',
    album: track.album ?? '',
    duration: track.duration ?? 0,
    file_path: track.file_path,
    file_hash: track.file_hash,
    format: track.format,
    bitrate: track.bitrate,
    created_at: Date.now(),
  });

  return info.lastInsertRowid;
}

export function updateTrack(id, data) {
  console.log(`Updating track ${id} with data:`, data);
  const fields = Object.keys(data);
  if (!fields.length) return;

  const set = fields.map(f => `${f} = @${f}`).join(', ');
  db.prepare(`
    UPDATE tracks
    SET ${set}, analyzed = 1
    WHERE id = @id
  `).run({ id, ...data });
}

export function getTracks({ limit = 50, offset = 0, search = '' }) {
  console.log("getTracks called with:", { limit, offset, search });
  if (search) {
    return db.prepare(`
      SELECT *
      FROM tracks
      WHERE title LIKE @q
         OR artist LIKE @q
         OR album LIKE @q
      ORDER BY created_at DESC
      LIMIT @limit OFFSET @offset
    `).all({
      q: `%${search}%`,
      limit,
      offset,
    });
  }

  return db.prepare(`
    SELECT *
    FROM tracks
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

export function getTrackIds({ search = '' } = {}) {
  if (search) {
    return db.prepare(`
      SELECT id FROM tracks
      WHERE title LIKE @q OR artist LIKE @q OR album LIKE @q
      ORDER BY created_at DESC
    `).all({ q: `%${search}%` }).map(r => r.id);
  }
  return db.prepare('SELECT id FROM tracks ORDER BY created_at DESC').all().map(r => r.id);
}

export function getTrackByHash(hash) {
  return db.prepare('SELECT * FROM tracks WHERE file_hash = ?').get(hash);
}

export function getTrackById(id) {
  return db.prepare('SELECT * FROM tracks WHERE id = ?').get(id);
}

export function removeTrack(id) {
  db.prepare('DELETE FROM tracks WHERE id = ?').run(id);
}

export function normalizeLibrary(targetLufs) {
  const tracks = db.prepare('SELECT id, loudness FROM tracks WHERE loudness IS NOT NULL').all();
  const stmt = db.prepare('UPDATE tracks SET replay_gain = ? WHERE id = ?');
  const run = db.transaction(() => {
    for (const t of tracks) {
      stmt.run(Math.round((targetLufs - t.loudness) * 10) / 10, t.id);
    }
  });
  run();
  return tracks.length;
}

export function clearTracks() {
  console.log('Clearing all tracks from database');
  db.prepare(`DELETE FROM tracks`).run();
  db.prepare(`VACUUM`).run();
}
