const app = require('./app');

const port = process.env.PORT || 4000;

// 0.0.0.0, jotta palvelin on tavoitettavissa Docker-kontin ulkopuolelta.
app.listen(port, '0.0.0.0', () => {
  console.log(`Server B käynnissä portissa ${port}`);
});
