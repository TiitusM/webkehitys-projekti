const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'animals.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS animals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    type        TEXT    NOT NULL CHECK (type IN ('kissa', 'koira')),
    age         INTEGER NOT NULL,
    breed       TEXT    NOT NULL,
    description TEXT,
    image_url   TEXT,
    status      TEXT    NOT NULL DEFAULT 'available'
                        CHECK (status IN ('available', 'adopted'))
  )
`);


const { c } = db.prepare('SELECT COUNT(*) AS c FROM animals').get();
if (c === 0) {
  const insert = db.prepare(
    `INSERT INTO animals (name, type, age, breed, description, image_url)
     VALUES (@name, @type, @age, @breed, @description, @image_url)`
  );
  const seed = [
    { name: 'Misse', type: 'kissa', age: 3, breed: 'Eurooppalainen lyhytkarvainen', description: 'Leikkisä ja utelias kissa, tulee toimeen lasten kanssa.', image_url: null },
    { name: 'Remu', type: 'koira', age: 5, breed: 'Saksanpaimenkoira', description: 'Uskollinen ja älykäs. Tarvitsee paljon liikuntaa.', image_url: null },
    { name: 'Lissu', type: 'kissa', age: 1, breed: 'Maine Coon', description: 'Energinen, rakastaa leikkimistä.', image_url: null },
    { name: 'Ropsu', type: 'koira', age: 8, breed: 'Labradorinnoutaja', description: 'Rauhallinen seniorikoira, sopii hyvin perheeseen.', image_url: null },
    { name: 'Tikru', type: 'kissa', age: 6, breed: 'Norjalainen metsänkissa', description: 'Rauhallinen sylikissa.', image_url: null },
    { name: 'Peppi', type: 'koira', age: 2, breed: 'Bordercollie', description: 'Vilkas ja oppivainen, tarvitsee aktiivisen kodin.', image_url: null },
    { name: 'Nelli', type: 'koira', age: 4, breed: 'Suomenlapinkoira', description: 'Sosiaalinen ja ystävällinen.', image_url: null },
    { name: 'Vili', type: 'kissa', age: 2, breed: 'Siamilainen', description: 'Seurallinen ja puhelias.', image_url: null },
  ];
  db.transaction(() => seed.forEach((a) => insert.run(a)))();
  console.log(`Esimerkkidata ladattu (${seed.length} eläintä)`);
}

module.exports = db;