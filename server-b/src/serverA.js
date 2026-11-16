// Server A:n kutsuminen. Server A omistaa eläintiedot, joten se päivittää
// eläimen statuksen adoptoiduksi.
const SERVER_A_URL = (process.env.SERVER_A_URL || 'http://server-a:3000').replace(/\/$/, '');

async function markAnimalAdopted(animalId) {
  const response = await fetch(`${SERVER_A_URL}/animals/${animalId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'adopted' }),
    signal: AbortSignal.timeout(5000),
  });

  return response;
}

module.exports = { markAnimalAdopted };
