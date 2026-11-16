// Backend-osoitteet: nginx välittää /api/* Server A:lle (ks. nginx.conf)
const API = '/api';
const TONES = ['#cfdccb', '#f3dfa2', '#c5d3e0', '#ebcfc7', '#d8d0e3'];
// Placeholder-kuva, kun eläimellä ei ole kuvaa: kissa- tai koirasiluetti, tausta vaihtelee id:n mukaan
function placeholder(a) {
  const bg = TONES[Number(a.id) % TONES.length] || TONES[0];
  const cat = typeOf(a) === 'cat';
  const shape = cat
    ? '<polygon points="140,120 150,50 195,95"/><polygon points="260,120 250,50 205,95"/><ellipse cx="200" cy="165" rx="72" ry="62"/>'
    : '<ellipse cx="125" cy="150" rx="26" ry="55" transform="rotate(12 125 150)"/><ellipse cx="275" cy="150" rx="26" ry="55" transform="rotate(-12 275 150)"/><ellipse cx="200" cy="160" rx="62" ry="68"/>';
  const face = '<circle cx="178" cy="155" r="7" fill="' + bg + '"/><circle cx="222" cy="155" r="7" fill="' + bg + '"/><ellipse cx="200" cy="180" rx="10" ry="7" fill="' + bg + '"/>';
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="' + bg + '"/><g fill="#1d2b4a">' + shape + '</g>' + face + '</svg>');
}

const $ = (s) => document.querySelector(s);
const h = (tag, props = {}, ...kids) => {
  const e = Object.assign(document.createElement(tag), props);
  kids.flat().forEach((k) => e.append(k));
  return e;
};
const typeOf = (a) => (/cat|kissa/i.test(a.type) ? 'cat' : 'dog');
const typeLabel = (a) => (typeOf(a) === 'cat' ? 'Kissa' : 'Koira');
const ageLabel = (a) => (isNaN(a.age) ? a.age : `${a.age} v`);
const ageLong = (a) => (isNaN(a.age) ? a.age : Number(a.age) === 1 ? '1 vuosi' : `${a.age} vuotta`);
const adopted = (a) => /adopt/i.test(String(a.status));
const photo = (a) => {
  const i = h('img', { src: a.imageUrl || a.image_url || a.image || placeholder(a), alt: a.name, loading: 'lazy' });
  i.onerror = () => { i.onerror = null; i.src = placeholder(a); };
  return i;
};
const show = (text) => { const m = $('#msg'); m.textContent = text; m.hidden = false; };

async function api(path, opts) {
  const r = await fetch(API + path, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || data.message || 'Virhe'), { status: r.status });
  return data;
}

// ---- Listanäkymä ----
async function listPage() {
  let animals = [];
  try { animals = await api('/animals'); } catch { $('#count').textContent = ''; return show('Eläinten lataus epäonnistui. Yritä hetken päästä uudelleen.'); }
  const draw = (f) => {
    const shown = animals.filter((a) => f === 'all' || typeOf(a) === f);
    $('#count').textContent = `${shown.length} eläintä odottaa kotia`;
    $('#list').replaceChildren(...shown.map((a) => h('article', { className: 'card' }, photo(a),
      h('div', { className: 'body' },
        h('h2', {}, a.name),
        h('p', { className: 'meta' }, `${typeLabel(a)}, ${ageLabel(a)}`),
        adopted(a) ? h('span', { className: 'badge gone' }, 'Adoptoitu') : '',
        h('a', { className: 'btn', href: `animal.html?id=${encodeURIComponent(a.id)}` }, 'Katso lisää')))));
    if (!shown.length) show('Tällä suodatuksella ei löytynyt eläimiä.'); else $('#msg').hidden = true;
  };
  document.querySelectorAll('.chip').forEach((c) => c.onclick = () => {
    document.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === c));
    draw(c.dataset.f);
  });
  draw('all');
}

// ---- Yksityiskohtasivu ----
async function animalPage() {
  const id = new URLSearchParams(location.search).get('id');
  let a;
  try { a = await api(`/animals/${encodeURIComponent(id)}`); } catch { return show('Eläintä ei löytynyt.'); }
  document.title = `${a.name} – Vaasan Eläinsuoja`;
  const fld = (id, label, type = 'text', req = true) =>
    h('label', {}, label, h('input', { id, name: id, type, required: req }));
  const msg = h('textarea', { id: 'message', name: 'message', rows: 3 });
  const send = h('button', { className: 'btn', type: 'submit', disabled: adopted(a) }, 'Adoptoi minut');
  const form = h('form', {}, h('h2', {}, `Adoptiohakemus: ${a.name}`),
    fld('applicantName', 'Nimesi'), fld('email', 'Sähköposti', 'email'), fld('phone', 'Puhelinnumero', 'tel'),
    h('label', {}, 'Kerro itsestäsi ja kodistasi', msg), send);
  if (adopted(a)) form.prepend(h('p', { className: 'note' }, 'Tämä eläin on jo adoptoitu.'));

  form.onsubmit = async (e) => {
    e.preventDefault();
    send.disabled = true; $('#msg').hidden = true;
    try {
      await api(`/animals/${encodeURIComponent(a.id)}/adopt`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      location.href = `thanks.html?name=${encodeURIComponent(a.name)}`;
    } catch (err) {
      show(err.status === 409 ? 'Joku ehti adoptoida tämän eläimen ensin.' : err.status ? err.message : 'Yhteys palvelimeen epäonnistui. Yritä hetken päästä uudelleen.');
      send.disabled = err.status === 409;
    }
  };

  const facts = [['Tyyppi', typeLabel(a)], ['Ikä', ageLong(a)], ['Rotu', a.breed || '–']];
  $('#detail').replaceChildren(h('div', { className: 'detail' }, photo(a), h('div', {},
    h('h1', {}, a.name),
    h('dl', { className: 'facts' }, facts.map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]).flat()),
    h('p', {}, a.description || ''), form)));
}

// ---- Kiitos-sivu ----
function thanksPage() {
  const n = new URLSearchParams(location.search).get('name');
  if (n) $('#thanks-text').textContent = `Adoptiohakemuksesi eläimelle ${n} on tallennettu. Eläinsuoja ottaa sinuun yhteyttä.`;
}

({ index: listPage, animal: animalPage, thanks: thanksPage })[document.body.dataset.page]();
