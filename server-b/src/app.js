const express = require('express');
const db = require('./db');
const { markAnimalAdopted } = require('./serverA');

const app = express();
app.use(express.json());

// Express 4 ei vielä välitä async-funktion virheitä eteenpäin itse,
// joten ohjataan ne virheenkäsittelijälle.
function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function toApi(row) {
  return {
    id: row.id,
    animalId: row.animal_id,
    animalName: row.animal_name,
    applicantName: row.applicant_name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    createdAt: row.created_at,
  };
}

function parseApplication(body) {
  const errors = [];

  const animalId = Number(body.animalId);
  if (!Number.isInteger(animalId) || animalId <= 0) {
    errors.push('animalId puuttuu tai on virheellinen');
  }

  const applicantName = typeof body.applicantName === 'string' ? body.applicantName.trim() : '';
  if (applicantName.length < 2) {
    errors.push('applicantName puuttuu tai on liian lyhyt');
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('email puuttuu tai on virheellinen');
  }

  const animalName = typeof body.animalName === 'string' ? body.animalName.trim() : null;
  const phone = typeof body.phone === 'string' ? body.phone.trim() : null;
  const message = typeof body.message === 'string' ? body.message.trim() : null;

  return {
    errors,
    application: { animalId, animalName, applicantName, email, phone, message },
  };
}

app.get('/', (req, res) => {
  res.json({
    service: 'Vaasan Eläinsuoja - Adoptiopalvelin (Server B)',
    endpoints: ['POST /adoptions', 'GET /adoptions', 'GET /adoptions/:id', 'GET /health'],
  });
});

app.get('/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok' });
  } catch {
    res.status(500).json({ status: 'error' });
  }
});

// Server A välittää adoptiohakemuksen tänne.
app.post('/adoptions', asyncRoute(async (req, res) => {
  const { errors, application } = parseApplication(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Hakemuksen tiedot ovat puutteelliset', details: errors });
  }

  // Tarkistetaan ensin, onko eläin jo adoptoitu.
  const existing = db
    .prepare('SELECT id FROM adoptions WHERE animal_id = ?')
    .get(application.animalId);
  if (existing) {
    return res.status(409).json({ error: 'Tämä eläin on jo adoptoitu' });
  }

  // Tallennetaan hakemus. UNIQUE-indeksi estää myös samanaikaiset tuplahakemukset.
  let adoptionId;
  try {
    const result = db
      .prepare(`
        INSERT INTO adoptions (animal_id, animal_name, applicant_name, email, phone, message)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        application.animalId,
        application.animalName,
        application.applicantName,
        application.email,
        application.phone,
        application.message
      );
    adoptionId = result.lastInsertRowid;
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Tämä eläin on jo adoptoitu' });
    }
    throw err;
  }

  // Pyydetään Server A:ta merkitsemään eläin adoptoiduksi.
  let response;
  try {
    response = await markAnimalAdopted(application.animalId);
  } catch (err) {
    console.error('Server A ei vastannut:', err.message);
    db.prepare('DELETE FROM adoptions WHERE id = ?').run(adoptionId);
    return res.status(502).json({ error: 'Eläimen tilan päivitys epäonnistui' });
  }

  if (!response.ok) {
    // Tilan päivitys epäonnistui -> poistetaan juuri tallennettu hakemus.
    db.prepare('DELETE FROM adoptions WHERE id = ?').run(adoptionId);

    if (response.status === 404) {
      return res.status(404).json({ error: 'Eläintä ei löytynyt' });
    }
    if (response.status === 409) {
      return res.status(409).json({ error: 'Tämä eläin on jo adoptoitu' });
    }
    return res.status(502).json({ error: 'Eläimen tilan päivitys epäonnistui' });
  }

  const adoption = db.prepare('SELECT * FROM adoptions WHERE id = ?').get(adoptionId);
  res.status(201).json({
    message: 'Adoptiohakemus vastaanotettu',
    adoption: toApi(adoption),
  });
}));

// Eläinsuojan henkilökunnalle: kaikki saapuneet hakemukset.
app.get('/adoptions', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM adoptions ORDER BY created_at DESC, id DESC')
    .all();
  res.json(rows.map(toApi));
});

app.get('/adoptions/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(404).json({ error: 'Hakemusta ei löytynyt' });
  }

  const row = db.prepare('SELECT * FROM adoptions WHERE id = ?').get(id);
  if (!row) {
    return res.status(404).json({ error: 'Hakemusta ei löytynyt' });
  }
  res.json(toApi(row));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Reittiä ei löytynyt' });
});

// next-parametri tarvitaan, jotta Express tunnistaa tämän virheenkäsittelijäksi.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Virheellinen JSON' });
  }

  console.error(err);
  res.status(500).json({ error: 'Palvelinvirhe' });
});

module.exports = app;
