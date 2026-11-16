FROM node:22-slim

# Slim eikä alpine: better-sqlite3 on natiivimoduuli, jolle slim-imagen
# glibc-binääri asentuu ilman erillisiä käännöstyökaluja.
WORKDIR /app

# Kopioidaan riippuvuustiedot ensin, jotta Dockerin välimuisti toimii.
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

RUN mkdir -p /app/data

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "src/index.js"]
