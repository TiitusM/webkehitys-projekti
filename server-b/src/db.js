// SQLite-tietokanta. Taulut luodaan automaattisesti, kun palvelin käynnistyy.
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'adoptions.db');

// Varmistetaan, että data-kansio on olemassa (esim. Docker-volumen sisällä).
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS adoptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    animal_id INTEGER NOT NULL,
    animal_name TEXT,
    applicant_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Samaa eläintä ei voi adoptoida kahdesti.
  CREATE UNIQUE INDEX IF NOT EXISTS idx_adoptions_animal_id
    ON adoptions (animal_id);
`);

module.exports = db;
