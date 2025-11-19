import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(__dirname, '..', 'teleprompter.db');

if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, '');
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    syncEnabled INTEGER DEFAULT 0,
    syncProvider TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profile_configs (
    id TEXT PRIMARY KEY,
    projectId TEXT,
    name TEXT NOT NULL,
    baseSpeed INTEGER NOT NULL,
    theme TEXT NOT NULL,
    fontFamily TEXT NOT NULL,
    fontSize INTEGER NOT NULL,
    lineHeight REAL NOT NULL,
    overlayPosition TEXT NOT NULL,
    overlayOpacity REAL NOT NULL,
    recordingPreferences TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    projectId TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recordings (
    id TEXT PRIMARY KEY,
    projectId TEXT,
    scriptId TEXT,
    filePath TEXT NOT NULL,
    durationSeconds REAL NOT NULL,
    notes TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    entityType TEXT NOT NULL,
    entityId TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS live_stream_configs (
    id TEXT PRIMARY KEY,
    projectId TEXT,
    platform TEXT NOT NULL,
    rtmpUrl TEXT NOT NULL,
    streamKey TEXT NOT NULL,
    description TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

try {
  db.exec('ALTER TABLE scripts ADD COLUMN projectId TEXT');
} catch (err) {
  // coluna já existe
}

export { db };
