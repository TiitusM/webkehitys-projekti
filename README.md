# Vaasan Eläinsuoja – adoptiosivusto

Web-kehityksen projektityö: eläinsuojan adoptiosivusto, jossa voi selata adoptoitavia
eläimiä ja jättää adoptiohakemuksen. Sovellus koostuu staattisesta frontendista sekä
kahdesta Node.js-palvelimesta. Tietokantana on SQLite, ja koko kokonaisuus ajetaan
Docker Composella.

## Opettajalle

- **GitHub-repositorio:** <https://github.com/TiitusM/webkehitys-projekti>
- **Haara:** `main`
- **Käynnistys:** yhdellä komennolla `docker compose up --build` (ohjeet alla)
- **Osoite käynnistyksen jälkeen:** <http://localhost:8080>
- **Erillisiä asennuksia ei tarvita** Dockerin lisäksi. Tietokannat ja esimerkkidata
  luodaan automaattisesti ensimmäisellä käynnistyksellä.

### Palautuksen tarkistuslista

- [x] Koodi on GitHubissa ja opettaja pääsee katsomaan sitä.
- [x] Asennus- ja käynnistysohjeet ovat tässä README-tiedostossa.
- [x] Jokaisella ryhmäläisellä on committeja `main`-haarassa
      ([commit-historia](https://github.com/TiitusM/webkehitys-projekti/commits/main)).

## Ryhmän jäsenet ja työnjako

| Nimi | GitHub | Keskeiset commitit |
| --- | --- | --- |
| Tiitus Mustonen | [@TiitusM](https://github.com/TiitusM) | Projektin runko, Docker Compose, Server B (adoptiopalvelin) |
| Lauri Vakkala | [@LauriKoira](https://github.com/LauriKoira) | Frontend, eläinten kuvat ja lomake |
| Krista Kukkola | Krista Kukkola (`kristakukkola46@gmail.com`) | Server A: eläinten REST API ja haku |

Commitit voi tarkistaa myös paikallisesti:

```bash
git shortlog -sne --all
git log --oneline --graph --all
```

## Arkkitehtuuri

```text
Selain
  │
  ▼
frontend (nginx, portti 8080)
  │  /api/*  →  proxy
  ▼
server-a (Node.js/Express, portti 3000)
  │  eläintietojen SQLite-tietokanta
  │  POST /animals/:id/adopt
  ▼
server-b (Node.js/Express, portti 4000)
     adoptiohakemusten SQLite-tietokanta
     päivittää eläimen tilan Server A:han
```

- **Frontend** on staattinen HTML/CSS/JavaScript-sivusto. Nginx tarjoilee sen ja
  välittää `/api/*`-pyynnöt Server A:lle.
- **Server A** omistaa eläintiedot. Se listaa eläimet, hakee yksittäisen eläimen ja
  välittää adoptiohakemuksen Server B:lle.
- **Server B** tallentaa adoptiohakemukset ja pyytää Server A:ta merkitsemään eläimen
  adoptoiduksi. Samaa eläintä ei voi adoptoida kahdesti.
- **SQLite-tietokannat** sijaitsevat Docker-volumeissa, joten tiedot säilyvät
  konttien uudelleenkäynnistyksen yli.

## Vaatimukset

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS)
  tai Docker Engine + Docker Compose -lisäosa (Linux)
- Git, jos projektin kloonaa GitHubista
- Satunnaiseen kehityskäyttöön (ilman Dockeria): Node.js 20 tai uudempi

Docker-asennuksessa Node.js:ää ei tarvitse asentaa erikseen.

## Pikakäynnistys Dockerilla (suositus)

1. Kloonaa repositorio ja siirry projektikansioon:

   ```bash
   git clone https://github.com/TiitusM/webkehitys-projekti.git
   cd webkehitys-projekti
   ```

2. Käynnistä koko sovellus:

   ```bash
   docker compose up --build
   ```

   Ensimmäinen käynnistys kestää hetken, koska Docker buildaa kolme imagea.
   Odota, kunnes lokiin ilmestyy mm. `Server A käynnissä portissa 3000` ja
   `Server B käynnissä portissa 4000`.

3. Avaa selaimessa: **<http://localhost:8080>**

4. Pysäytys: paina `Ctrl+C` tai aja toisessa terminaalissa:

   ```bash
   docker compose down
   ```

### Uudelleenkäynnistys taustalla

```bash
docker compose up -d
docker compose ps
docker compose logs -f
```

### Tietokantojen nollaus

Demodata palautetaan alkutilaan poistamalla Docker-volumet:

```bash
docker compose down -v
docker compose up --build
```

> `down -v` poistaa kaikki tallennetut adoptiohakemukset ja eläinten tilat.

## Portit

| Palvelu | Osoite | Kuvaus |
| --- | --- | --- |
| Frontend | <http://localhost:8080> | Käyttöliittymä (nginx) |
| Server A | <http://localhost:3000> | Eläin-API ja API-yhdyskäytävä |
| Server B | <http://localhost:4000> | Adoptiohakemusten API |

Jos jokin porteista on käytössä, vaihda `docker-compose.yml`-tiedostossa vasemmanpuoleinen
host-portti, esimerkiksi `"8081:80"`, ja avaa sovellus uudesta osoitteesta.

## Käynnistys ilman Dockeria (API-kehitys)

Tämä vaihtoehto sopii palvelinten ja API:en testaamiseen. Koko käyttöliittymä vaatii
nginx-välityspalvelimen, joten koko sovelluksen ajamiseen suositellaan Dockeria.

**Terminaali 1 – Server A:**

```bash
cd server-a/server-a
npm install
npm start
```

**Terminaali 2 – Server B:**

macOS/Linux:

```bash
cd server-b
npm install
SERVER_A_URL=http://localhost:3000 npm start
```

Windows PowerShell:

```powershell
cd server-b
npm install
$env:SERVER_A_URL = "http://localhost:3000"
npm start
```

Tietokannat luodaan automaattisesti:

- `server-a/server-a/data/animals.db` (sisältää 8 esimerkkieläintä)
- `server-b/data/adoptions.db`

Palvelinten osoitteet ilman Dockeria:

- Server A: <http://localhost:3000>
- Server B: <http://localhost:4000>

## API

Kun sovellus ajetaan Dockerilla, käyttöliittymä kutsuu Server A:ta nginx-välityksen
kautta osoitteessa `/api/*`. Alla olevat polut toimivat sellaisenaan portissa 8080.

### Server A (frontendin kautta)

| Metodi | Polku | Kuvaus |
| --- | --- | --- |
| `GET` | `/api/animals` | Listaa eläimet. Suodattimet: `type`, `breed`, `minAge`, `maxAge`, `status` |
| `GET` | `/api/animals/:id` | Hakee yksittäisen eläimen |
| `POST` | `/api/animals/:id/adopt` | Jättää adoptiohakemuksen |
| `PATCH` | `/api/animals/:id/status` | Päivittää tilan (`available` / `adopted`) |
| `GET` | `/api/health` | Server A:n terveystarkistus |

Esimerkki listauksesta:

```bash
curl http://localhost:8080/api/animals
curl "http://localhost:8080/api/animals?type=kissa&status=available"
```

Esimerkki adoptiohakemuksesta:

```bash
curl -X POST http://localhost:8080/api/animals/1/adopt \
  -H "Content-Type: application/json" \
  -d '{"applicantName":"Testi Hakija","email":"testi@example.com","phone":"0401234567","message":"Kertoisin kodistani."}'
```

### Server B (suoraan)

| Metodi | Polku | Kuvaus |
| --- | --- | --- |
| `GET` | `/health` | Terveystarkistus |
| `POST` | `/adoptions` | Vastaanottaa adoptiohakemuksen |
| `GET` | `/adoptions` | Listaa kaikki hakemukset (henkilökunnalle) |
| `GET` | `/adoptions/:id` | Hakee yksittäisen hakemuksen |

## Projektin rakenne

```text
.
├── docker-compose.yml          # Koko sovelluksen käynnistys
├── frontend/
│   ├── Dockerfile              # nginx-image
│   ├── nginx.conf              # /api/* → server-a:3000
│   └── public/                 # HTML, CSS, JavaScript ja eläinkuvat
├── server-a/
│   └── server-a/
│       ├── Dockerfile
│       └── src/                # Express-palvelin ja SQLite-tietokanta
└── server-b/
    ├── Dockerfile
    ├── scripts/                # Mock Server A paikalliseen testaukseen
    └── src/                    # Adoptiopalvelin ja SQLite-tietokanta
```

## Vianetsintä

**`port is already allocated`**

Jokin portti 8080, 3000 tai 4000 on varattu. Pysäytä vanha kontti
(`docker compose down`) tai vaihda host-portti `docker-compose.yml`-tiedostossa.

**Sivu ei avaudu / `Eläinten lataus epäonnistui`**

Tarkista, että kaikki kontit ovat käynnissä ja terveitä:

```bash
docker compose ps
docker compose logs server-a
docker compose logs server-b
```

**Adoptio palauttaa virheen 502**

Server B ei saa yhteyttä Server A:han. Tarkista konttien välinen verkko ja
`SERVER_A_URL`-ympäristömuuttuja:

```bash
docker compose logs -f server-a server-b
```

**Docker ei käynnisty**

Varmista, että Docker Desktop (tai Docker-daemon Linuxilla) on käynnissä ennen
`docker compose` -komentoa.

**Haluan aloittaa puhtaasta tietokannasta**

```bash
docker compose down -v
docker compose up --build
```
