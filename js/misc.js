/**
 * misc.js — RUAH
 * Helpers de UI, filtros, covers y utilidades varias.
 */

// ── Extractores de ID ────────────────────────────────────

function spId(url) {
  // Se mantiene por compatibilidad con datos existentes (campo spotify en JSON)
  const m = (url || '').match(/track\/([A-Za-z0-9]+)/);
  return m ? m[1] : '';
}

function ytId(url) {
  const m = (url || '').match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_\-]{11})/);
  return m ? m[1] : '';
}

// ── Sanitización ────────────────────────────────────────

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function deacc(s) {
  return (s || '')
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
    .toLowerCase();
}

// ── Chips de tags ────────────────────────────────────────

function buildTagChips() {
  const bar = document.getElementById('filter-bar');
  ALL_TAGS.forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.dataset.tag = tag;
    chip.textContent = tag;
    chip.onclick = () => setTag(tag, chip);
    bar.appendChild(chip);
  });
}

// ── Filtrado y ordenamiento ──────────────────────────────

function getRandomOrder() {
  if (!randomOrder || randomOrder.length !== songs.length) {
    randomOrder = [...Array(songs.length).keys()];
    for (let i = randomOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [randomOrder[i], randomOrder[j]] = [randomOrder[j], randomOrder[i]];
    }
  }
  return randomOrder;
}

function getVisible() {
  const q = deacc(document.getElementById('si').value.trim());
  return songs.filter(s => {
    const mq = !q
      || deacc(s.title).includes(q)
      || deacc(s.artist || '').includes(q)
      || deacc(s.composer || '').includes(q);
    const mf = filt !== 'fav' || s.fav;
    const mt = tagFilt === 'all' || (s.tags || []).includes(tagFilt);
    return mq && mf && mt;
  });
}

function sortedVisible() {
  const vis = getVisible();
  if (sortMode === 'alpha')
    return vis.sort((a, b) => deacc(a.title).localeCompare(deacc(b.title), 'es'));
  if (sortMode === 'artist')
    return vis.sort((a, b) => deacc(a.artist || '').localeCompare(deacc(b.artist || ''), 'es'));
  if (sortMode === 'composer')
    return vis.sort((a, b) => deacc(a.composer || '').localeCompare(deacc(b.composer || ''), 'es'));
  if (sortMode === 'random') {
    const ro = getRandomOrder();
    return ro.map(i => songs[i]).filter(s => {
      if (!s) return false;
      const q = deacc(document.getElementById('si').value.trim());
      const mq = !q || deacc(s.title).includes(q) || deacc(s.artist || '').includes(q);
      const mf = filt !== 'fav' || s.fav;
      const mt = tagFilt === 'all' || (s.tags || []).includes(tagFilt);
      return mq && mf && mt;
    });
  }
  return vis;
}

// ── Cover de la canción (solo YouTube) ──────────────────

async function loadCover(song) {
  const ci = document.getElementById('cover-img');
  const cl = document.getElementById('cover-loader');
  const si = document.getElementById('song-info');

  // Reset estado visual
  ci.style.display  = 'none';
  cl.style.display  = 'none';
  si.style.marginLeft = '0';

  const yt = song.ytId;
  if (!yt) return;

  // Cache hit
  if (thumbCache[yt]) {
    ci.src = thumbCache[yt];
    ci.style.display    = 'block';
    si.style.marginLeft = '10px';
    return;
  }

  // Mostrar loader
  cl.style.display    = 'flex';
  si.style.marginLeft = '10px';

  // YouTube ofrece thumbnails directos — sin proxy, sin autenticación
  // mqdefault = 320×180, hqdefault = 480×360
  const thumbUrl = `https://img.youtube.com/vi/${yt}/mqdefault.jpg`;

  thumbCache[yt] = thumbUrl;
  ci.src = thumbUrl;

  ci.onload  = () => { cl.style.display = 'none'; ci.style.display = 'block'; };
  ci.onerror = () => {
    cl.style.display    = 'none';
    ci.style.display    = 'none';
    si.style.marginLeft = '0';
    delete thumbCache[yt]; // limpiar cache si la imagen no existe
  };
}

// ── Favorito ─────────────────────────────────────────────

function updateFavBtn() {
  const s = songs.find(x => x.id === curId);
  if (!s) return;
  const btn = document.getElementById('btn-fav');
  if (btn) btn.classList.toggle('faved', s.fav);
  // fav-lbl es opcional (nuevo header no lo tiene)
  const lbl = document.getElementById('fav-lbl');
  if (lbl) lbl.textContent = s.fav ? 'Guardada' : 'Guardar';
}

// ── Sync tonalidad en editor ─────────────────────────────

function syncKeyChip() {
  const key = document.getElementById('ed-key').value.trim();
  const td  = document.getElementById('td');
  if (td && key) td.textContent = key;
}
