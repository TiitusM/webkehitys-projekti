# Vaasan Eläinsuoja – adoptiosivusto

Web-kehityksen projektityö: eläinsuojan adoptiosivusto, jossa voi selata adoptoitavia
eläimiä ja jättää adoptiohakemuksen. Sovellus koostuu staattisesta frontendista sekä
kahdesta Node.js-palvelimesta. Tietokantana on SQLite, ja koko kokonaisuus ajetaan
Docker Composella.

---

## Opettajalle: pikaohje

| | |
| --- | --- |
| **GitHub-repositorio** | <https://github.com/TiitusM/webkehitys-projekti> |
| **Haara** | `main` |
| **Käynnistys** | `docker compose up --build` |
| **Osoite käynnistyksen jälkeen** | <http://localhost:8080> |
| **Asennettavat asiat** | Vain Docker Desktop. `npm install`- tai tietokanta-asennuksia **ei** tarvita. |

Kolme komentoa riittää:

```bash
git clone https://github.com/TiitusM/webkehitys-projekti.git
cd webkehitys-projekti
docker compose up --build
```

Kun lokiin ilmestyy `Server A käynnissä portissa 3000` ja `Server B käynnissä portissa 4000`,
avaa selaimessa **<http://localhost:8080>**. Tietokannat ja 8 esimerkkieläintä luodaan
automaattisesti ensimmäisellä käynnistyksellä.

## Ryhmän jäsenet ja työnjako

| Nimi | GitHub | Keskeiset commitit |
| --- | --- | --- |
| Tiitus Mustonen | [@TiitusM](https://github.com/TiitusM) | Projektin runko, Docker Compose, Server B (adoptiopalvelin) |
| Lauri Vakkala | [@LauriKoira](https://github.com/LauriKoira) | Frontend, eläinten kuvat ja lomake |
| Krista Kukkola | Krista Kukkola (`kristakukkola46@gmail.com`) | Server A: eläinten REST API ja haku |