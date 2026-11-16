const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SERVER_B_URL = process.env.SERVER_B_URL || 'http://localhost:4000';

app.use(cors());
app.use(express.json());


const toAnimal = (r) => ({
  id: r.id,
  name: r.name,
  type: r.type,
  age: r.age,
  breed: r.breed,
  description: r.description,
  imageUrl: r.image_url,
  status: r.status,
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));


app.get('/animals', (req, res) => {
  const { type, breed, minAge, maxAge, status = 'available' } = req.query;
  const where = [];
  const params = {};

  if (type) {
    where.push('LOWER(type) = LOWER(@type)');
    params.type = type;
  }
  if (breed) {
    where.push('LOWER(breed) LIKE LOWER(@breed)');
    params.breed = `%${breed}%`;
  }
  if (minAge !== undefined && minAge !== '') {
    if (isNaN(Number(minAge))) return res.status(400).json({ error: 'minAge pitää olla numero' });
    where.push('age >= @minAge');
    params.minAge = Number(minAge);
  }
  if (maxAge !== undefined && maxAge !== '') {
    if (isNaN(Number(maxAge))) return res.status(400).json({ error: 'maxAge pitää olla numero' });
    where.push('age <= @maxAge');
    params.maxAge = Number(maxAge);
  }
  if (status !== 'all') {
    where.push('status = @status');
    params.status = status;
  }

  const sql = `SELECT * FROM animals ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id`;
  res.json(db.prepare(sql).all(params).map(toAnimal));
});


app.get('/animals/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Eläintä ei löytynyt' });
  res.json(toAnimal(row));
});


app.post('/animals/:id/adopt', async (req, res) => {
  const animal = db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id);
  if (!animal) return res.status(404).json({ error: 'Eläintä ei löytynyt' });
  if (animal.status === 'adopted') {
    return res.status(409).json({ error: 'Tämä eläin on jo adoptoitu' });
  }

  const { applicantName, email, phone, message } = req.body || {};
  if (!applicantName || !email || !phone) {
    return res.status(400).json({ error: 'Nimi, sähköposti ja puhelinnumero vaaditaan' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Sähköpostiosoite ei ole kelvollinen' });
  }

  try {
    const response = await fetch(`${SERVER_B_URL}/adoptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        animalId: animal.id,
        animalName: animal.name,
        applicantName,
        email,
        phone,
        message: message || '',
      }),
      signal: AbortSignal.timeout(5000),
    });

    const data = await response.json().catch(() => ({}));
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('Yhteys Server B:hen epäonnistui:', err.message);
    return res.status(502).json({ error: 'Adoptiopalvelin ei vastaa, yritä myöhemmin uudelleen' });
  }
});


app.patch('/animals/:id/status', (req, res) => {
  const { status } = req.body || {};
  if (!['available', 'adopted'].includes(status)) {
    return res.status(400).json({ error: "status pitää olla 'available' tai 'adopted'" });
  }
  const result = db.prepare('UPDATE animals SET status = ? WHERE id = ?').run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Eläintä ei löytynyt' });
  res.json(toAnimal(db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id)));
});

app.listen(PORT, () => console.log(`Server A käynnissä portissa ${PORT}`));