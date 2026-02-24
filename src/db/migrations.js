// src/db/migrations.js
import db from './database.js';

export function initDB() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      -- File
      file_path TEXT,
      file_hash TEXT,
      format TEXT,
      bitrate INTEGER,
      duration REAL,

      -- Tags
      title TEXT NOT NULL,
      artist TEXT,
      album TEXT,
      year INTEGER,
      label TEXT,
      genres TEXT,

      -- Analysis
      bpm REAL,
      bpm_override REAL,
      key_raw TEXT,
      key_camelot TEXT,
      energy REAL,
      loudness REAL,
      replay_gain REAL,
      intro_secs REAL,
      outro_secs REAL,

      -- User
      rating INTEGER,
      comments TEXT,

      analyzed INTEGER DEFAULT 0,
      created_at INTEGER
    )
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_tracks_created_at
    ON tracks(created_at)
  `).run();

  // Migrate existing databases — safe to run on fresh installs too
  for (const col of [
    'ALTER TABLE tracks ADD COLUMN bpm_override REAL',
    'ALTER TABLE tracks ADD COLUMN replay_gain REAL',
    'ALTER TABLE tracks ADD COLUMN intro_secs REAL',
    'ALTER TABLE tracks ADD COLUMN outro_secs REAL',
  ]) {
    try { db.prepare(col).run(); } catch { /* column already exists */ }
  }

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_tracks_title
    ON tracks(title)
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_tracks_artist
    ON tracks(artist)
  `).run();

  // Legacy tables (safe to keep, unused for now)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlist_id INTEGER NOT NULL,
      track_id INTEGER NOT NULL,
      track_order INTEGER NOT NULL,
      PRIMARY KEY (playlist_id, track_id)
    )
  `).run();
}
