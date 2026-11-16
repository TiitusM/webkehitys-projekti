// Pieni mock Server A:sta, jotta Server B:tä voi testata ilman oikeaa Server A:ta.
// Käynnistys: npm run mock-a
const express = require('express');

const app = express();
app.use(express.json());

const animals = [
  { id: 1, name: 'Misu', species: 'kissa', status: 'available' },
  { id: 2, name: 'Rekku', species: 'koira', status: 'available' },
];

app.get('/animals', (req, res) => {
  res.json(animals);
});

app.patch('/animals/:id/status', (req, res) => {
  const animal = animals.find((a) => a.id === Number(req.params.id));
  if (!animal) {
    return res.status(404).json({ error: 'Eläintä ei löytynyt' });
  }
  if (animal.status === 'adopted') {
    return res.status(409).json({ error: 'Eläin on jo adoptoitu' });
  }

  animal.status = req.body.status;
  res.json(animal);
});

app.listen(3000, () => {
  console.log('Mock Server A käynnissä portissa 3000');
});
