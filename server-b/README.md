# Server B – Adoptiopalvelin

Vaasan Eläinsuoja ry:n adoptiosovelluksen **adoptiopalvelin**. Palvelu vastaanottaa
adoptiohakemukset Server A:lta, tallentaa ne SQLite-tietokantaan ja merkitsee eläimen
adoptoiduksi Server A:ssa.

Palvelu on tarkoitettu vain Server A:n kutsuttavaksi sisäverkossa (ei käyttäjätunnistusta).

## Teknologiat

- Node.js 22 + Express
- SQLite ([better-sqlite3](https://github.com/WiseLibs/better-sqlite3))
- Docker + Docker Compose

## Rakenne

```
server-b/
├── src/
│   ├── index.js        # palvelimen käynnistys
│   ├── app.js          # Express-sovellus ja reitit
│   ├── db.js           # SQLite-yhteys ja taulujen luonti
│   └── serverA.js      # Server A:n kutsuminen (statuksen päivitys)
├── scripts/
│   └── mock-server-a.js # pieni mock Server A:sta testaamista varten
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## API

| Metodi | Reitti          | Kuvaus                                      |
| ------ | --------------- | ------------------------------------------- |
| POST   | `/adoptions`    | Vastaanottaa adoptiohakemuksen Server A:lta |
| GET    | `/adoptions`    | Listaa kaikki hakemukset (henkilökunnalle)  |
| GET    | `/adoptions/:id`| Yksittäinen hakemus                         |
| GET    | `/health`       | Healthcheck Dockeria varten                 |

### POST /adoptions

Server A lähettää hakemuksen. Pakolliset kentät ovat `animalId`, `applicantName` ja `email`.

```json
{
  "animalId": 1,
  "animalName": "Misu",
  "applicantName": "Maija Meikäläinen",
  "email": "maija@example.com",
  "phone": "0401234567",
  "message": "Haluaisin adoptoida Misun."
}
```

Onnistunut vastaus (201):

```json
{
  "message": "Adoptiohakemus vastaanotettu",
  "adoption": {
    "id": 1,
    "animalId": 1,
    "animalName": "Misu",
    "applicantName": "Maija Meikäläinen",
    "email": "maija@example.com",
    "phone": "0401234567",
    "message": "Haluaisin adoptoida Misun.",
    "createdAt": "2026-11-16 12:33:54"
  }
}
```

Virhetilanteet:

| Koodi | Tilanne                                                        |
| ----- | -------------------------------------------------------------- |
| 400   | Pakollisia kenttiä puuttuu tai sähköposti on virheellinen       |
| 404   | Eläintä ei löytynyt Server A:sta                                |
| 409   | Eläin on jo adoptoitu                                           |
| 502   | Eläimen tilan päivitys Server A:han epäonnistui                 |

## Tietokanta

Taulu `adoptions` luodaan automaattisesti, kun palvelin käynnistyy (`src/db.js`).
SQLite-tiedosto sijaitsee oletuksena polussa `data/adoptions.db` (Dockerissa
`/app/data/adoptions.db`), joten tiedot säilyvät kontin uudelleenkäynnistyksen yli.

```sql
CREATE TABLE IF NOT EXISTS adoptions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  animal_id      INTEGER NOT NULL,
  animal_name    TEXT,
  applicant_name TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  message        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Samaa eläintä ei voi adoptoida kahdesti.
CREATE UNIQUE INDEX IF NOT EXISTS idx_adoptions_animal_id
  ON adoptions (animal_id);
```

`animal_id` viittaa Server A:n eläimeen. `animal_name` tallennetaan hakemuksen yhteyteen,
jotta henkilökunnan hakemuslista on luettavissa ilman Server A:n tietoja.

**Samaa eläintä ei voi adoptoida uudestaan.** Tämä varmistetaan sekä tarkistuksella ennen
lisäystä että `animal_id`-sarakkeen UNIQUE-indeksillä. Indeksi estää myös tilanteen, jossa
kaksi hakemusta saapuu samanaikaisesti: toinen insert-epäonnistuu ja palautetaan 409.

## Adoptioprosessi

1. Frontend lähettää lomakkeen Server A:lle (`POST /animals/:id/adopt`).
2. Server A välittää hakemuksen Server B:lle (`POST /adoptions`).
3. Server B tarkistaa, ettei eläintä ole jo adoptoitu, ja tallentaa hakemuksen.
4. Server B pyytää Server A:ta päivittämään eläimen statuksen (`PATCH /animals/:id/status`).
5. Server A palauttaa vahvistuksen, ja Server B palauttaa hakemuksen tiedot Server A:lle.
6. Server A palauttaa tuloksen frontendille, joka näyttää kiitos-sivun.

Jos vaiheen 4 pyyntö epäonnistuu, Server B poistaa juuri tallennetun hakemuksen, jotta
tietokanta ja eläimen status eivät jää eri tilaan.

## Server A:n rajapinta

Server B olettaa, että Server A:ssa on seuraava endpoint:

```
PATCH /animals/:id/status
Content-Type: application/json

{ "status": "adopted" }
```

Vastaukset: `200` onnistui, `404` eläintä ei löytynyt, `409` eläin on jo adoptoitu.

Esimerkki Server A:n toteutuksesta:

```js
app.patch('/animals/:id/status', (req, res) => {
  const animal = animals.find((a) => a.id === Number(req.params.id));
  if (!animal) return res.status(404).json({ error: 'Eläintä ei löytynyt' });
  if (animal.status === 'adopted') return res.status(409).json({ error: 'Jo adoptoitu' });

  animal.status = req.body.status;
  res.json(animal);
});
```

Server A:n osoite annetaan ympäristömuuttujalla `SERVER_A_URL` (oletus
`http://server-a:3000`, joka toimii Docker-verkossa).

## Käynnistys

### Dockerilla

```bash
cd server-b
docker compose up --build
```

Palvelin vastaa osoitteessa <http://localhost:4000/health>.

Oletuksena `SERVER_A_URL` on `http://server-a:3000`, eli osoite toimii, kun Server B
ajetaan osana koko projektin Docker Composea. Jos haluat testata Server B:tä yksin
Dockerissa, käynnistä mock Server A omalla koneella (ks. alla) ja anna osoite:

```powershell
# Windows PowerShell
$env:SERVER_A_URL = "http://host.docker.internal:3000"
docker compose up --build
```

```bash
# macOS / Linux
SERVER_A_URL=http://host.docker.internal:3000 docker compose up --build
```

### Ilman Dockeria

```bash
cd server-b
npm install

# Paikallinen Server A (esim. mock) kuuntelee localhostissa.
SERVER_A_URL=http://localhost:3000 npm start
```

```powershell
# Windows PowerShell
$env:SERVER_A_URL = "http://localhost:3000"
npm start
```

Palvelin käynnistyy porttiin 4000. Tietokanta luodaan automaattisesti kansioon `data/`.

### Testaus ilman Server A:ta (mock)

Mock Server A löytyy tiedostosta `scripts/mock-server-a.js`. Se tarjoaa kaksi eläintä
ja `PATCH /animals/:id/status` -endpointin.

```bash
# terminaali 1
npm install
npm run mock-a

# terminaali 2
SERVER_A_URL=http://localhost:3000 npm start
```

Windows PowerShellissä aseta `$env:SERVER_A_URL = "http://localhost:3000"` ennen
`npm start` -komentoa.

Esimerkkihakemus:

```http
POST http://localhost:4000/adoptions
Content-Type: application/json

{
  "animalId": 1,
  "animalName": "Misu",
  "applicantName": "Maija Meikäläinen",
  "email": "maija@example.com"
}
```

Saman eläimen toinen hakemus palauttaa `409`, ja mock Server A:n eläinlista näyttää
statuksen `adopted` (`GET http://localhost:3000/animals`).

### Tietokannan nollaus

```bash
docker compose down -v
```

## Integrointi koko projektin Docker Composeen

Lisää Server B muiden palveluiden rinnalle. Server A kutsuu osoitetta
`http://server-b:4000/adoptions` Docker-verkon sisällä.

```yaml
services:
  server-b:
    build: ./server-b
    container_name: elainsuoja-server-b
    environment:
      PORT: 4000
      DB_PATH: /app/data/adoptions.db
      SERVER_A_URL: http://server-a:3000
    ports:
      - "4000:4000"
    volumes:
      - adoptions-data:/app/data

volumes:
  adoptions-data:
```

## Rajaukset

- Palvelussa ei ole käyttäjätunnistusta, koska sitä kutsutaan vain Server A:n kautta.
- Hakemuksen hyväksyminen/hylkääminen kuuluu eläinsuojan prosessiin, eikä sitä ole
  toteutettu tässä palvelussa.
