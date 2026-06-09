/**
 * app.js — FIAT
 * Orquestador principal de la aplicación.
 *
 * Responsabilidades:
 *   - Renderizar la lista de canciones
 *   - Abrir y mostrar una canción
 *   - Filtros, búsqueda, ordenamiento
 *   - Transposición (UI)
 *   - Favoritos
 *   - Setlist
 *   - Modo impresión
 *   - Editor (save, delete, preview, toolbar)
 *   - Panel admin (tabla, sort, delete, persistencia)
 *   - Navegación entre vistas
 *   - Init (carga del JSON + arranque)
 *
 * Depende de (globals cargadas antes):
 *   state.js · transposer.js · migrator.js · parser.js · renderer.js
 *   misc.js  · mobile.js    · editor.js
 */

// ═══════════════════════════════════════════════════════
// LISTA DE CANCIONES
// ═══════════════════════════════════════════════════════

function renderList() {
  const vis = sortedVisible();
  document.getElementById('cnt').textContent = vis.length + ' canciones';
  document.getElementById('sort-disp').textContent = SORT_LABELS[sortMode] || '';

  const body = document.getElementById('list-body');
  body.innerHTML = '';
  let lastGroup = '';

  vis.forEach(s => {
    // Separador alfabético por primera letra del campo activo
    let group = '';
    if (sortMode === 'alpha' || sortMode === 'random') {
      group = s.title.replace(/^(EL |LA |LOS |LAS |UN |UNA )/i, '')[0] || s.title[0];
    } else if (sortMode === 'artist') {
      group = (s.artist || '—')[0].toUpperCase();
    } else if (sortMode === 'composer') {
      group = (s.composer || '—')[0].toUpperCase();
    }

    if (group !== lastGroup && sortMode !== 'random') {
      const div = document.createElement('div');
      div.className = 'alpha-div';
      div.textContent = group;
      body.appendChild(div);
      lastGroup = group;
    }

    const row = document.createElement('div');
    row.className = 'srow' + (s.id === curId ? ' act' : '');
    const tagsHTML = (s.tags || []).length
      ? `<div class="sr-tags">${(s.tags || []).map(t => `<span class="sr-tag">${t}</span>`).join('')}</div>`
      : '';
    row.innerHTML = `<div class="sr-t">${esc(s.title)}</div><div class="sr-a">${esc(s.artist) || '—'}</div>${tagsHTML}`;
    row.onclick = () => openSong(s.id);
    body.appendChild(row);
  });
}

// ═══════════════════════════════════════════════════════
// ABRIR CANCIÓN
// ═══════════════════════════════════════════════════════

function openSong(id) {
  const s = songs.find(x => x.id === id);
  if (!s) return;

  curId = id;
  sem = 0;

  // Mostrar el detalle inmediatamente (mobile: pantalla completa)
  document.getElementById('empty').style.display     = 'none';
  document.getElementById('song-view').style.display = 'flex';
  document.getElementById('detail').scrollTop        = 0;
  mobileAbrirDetalle();

  // Rellenar datos
  document.getElementById('s-title').textContent    = s.title;
  document.getElementById('s-artist').textContent   = s.artist || '';
  document.getElementById('s-composer').textContent = s.composer ? 'Composición: ' + s.composer : '';
  document.getElementById('s-tags-row').innerHTML   = (s.tags || [])
    .map(t => `<span class="s-tag" onclick="setTag('${t}',null)">${t}</span>`)
    .join('');
  document.getElementById('td').textContent         = s.key || '—';
  document.getElementById('tp-rst').style.display   = 'none';

  updateFavBtn();

  try { blocks = Parser.parse(Migrator.migrate(s.content)); renderBody(); } catch(e) { console.warn('render:', e); }
  try { renderLinks(s); } catch(e) { console.warn('links:', e); }
  try { loadCover(s);   } catch(e) { console.warn('cover:', e); }

  renderList();
}

// ── Renderiza el cuerpo de la canción actual ──────────────

function renderBody() {
  const container = document.getElementById('sbody');
  container.innerHTML = '';
  container.appendChild(Renderer.render(blocks, sem, printMode));
  printMode
    ? container.classList.add('print-mode')
    : container.classList.remove('print-mode');
}

// ── Links externos (Spotify / YouTube) ───────────────────

function renderLinks(s) {
  const el = document.getElementById('slinks');
  const parts = [];
  if (s.spotify) parts.push(
    `<a class="lbadge sp" href="${s.spotify}" target="_blank">` +
    `<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">` +
    `<path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>` +
    `</svg>Spotify</a>`
  );
  if (s.youtube) parts.push(
    `<a class="lbadge yt" href="${s.youtube}" target="_blank">` +
    `<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">` +
    `<path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>` +
    `</svg>YouTube</a>`
  );
  el.style.display = parts.length ? 'flex' : 'none';
  el.innerHTML = parts.join('');
}

// ═══════════════════════════════════════════════════════
// TRANSPOSICIÓN
// ═══════════════════════════════════════════════════════

function doTp(delta) {
  const s = songs.find(x => x.id === curId);
  if (!s) return;
  sem = ((sem + delta) % 12 + 12) % 12;
  if (sem > 6) sem -= 12; // preferir el camino más corto
  document.getElementById('td').textContent         = Transposer.displayKey(s.key, sem);
  document.getElementById('tp-rst').style.display   = sem !== 0 ? 'flex' : 'none';
  renderBody();
}

function doTpRst() {
  const s = songs.find(x => x.id === curId);
  if (!s) return;
  sem = 0;
  document.getElementById('td').textContent       = s.key || '—';
  document.getElementById('tp-rst').style.display = 'none';
  renderBody();
}

// ═══════════════════════════════════════════════════════
// FAVORITOS
// ═══════════════════════════════════════════════════════

function toggleFav() {
  const s = songs.find(x => x.id === curId);
  if (!s) return;
  s.fav = !s.fav;
  updateFavBtn();
  renderList();
  toast(s.fav ? '★ Guardada en favoritas' : 'Eliminada de favoritas');
}

// ═══════════════════════════════════════════════════════
// MODO IMPRESIÓN
// ═══════════════════════════════════════════════════════

function togglePrint() {
  printMode = !printMode;
  document.getElementById('pill-print').classList.toggle('on', printMode);
  if (curId) renderBody();
  toast(printMode ? 'Acordes ocultos' : 'Acordes visibles');
}

// ═══════════════════════════════════════════════════════
// COPIAR LETRA
// ═══════════════════════════════════════════════════════

function copySong() {
  const s = songs.find(x => x.id === curId);
  if (!s) return;
  navigator.clipboard.writeText(s.title + '\n' + (s.artist || '') + '\n\n' + s.content).catch(() => {});
  toast('Letra copiada');
}

// ═══════════════════════════════════════════════════════
// SETLIST
// ═══════════════════════════════════════════════════════

function toggleSL() {
  slOpen = !slOpen;
  document.getElementById('sl-panel').classList.toggle('on', slOpen);
  document.getElementById('pill-sl').classList.toggle('on', slOpen);
}

function addToSL() {
  if (!curId) return;
  if (setlist.includes(curId)) { toast('Ya está en el setlist'); return; }
  setlist.push(curId);
  renderSL();
  toast('Agregada al setlist ✓');
}

function removeFromSL(id) {
  setlist = setlist.filter(x => x !== id);
  renderSL();
}

function clearSL() {
  setlist = [];
  renderSL();
}

function renderSL() {
  const sc = document.getElementById('sl-scroll');
  if (!setlist.length) {
    sc.innerHTML = '<div class="sl-empty">Sin canciones aún.</div>';
    return;
  }
  sc.innerHTML = setlist.map((id, i) => {
    const s = songs.find(x => x.id === id);
    if (!s) return '';
    return `<div class="sl-row" onclick="openSong('${id}')">` +
           `<span class="sl-num">${i + 1}</span>` +
           `<span style="flex:1;font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.title)}</span>` +
           `<button class="sl-del" onclick="event.stopPropagation();removeFromSL('${id}')">✕</button>` +
           `</div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════
// FILTROS Y BÚSQUEDA
// ═══════════════════════════════════════════════════════

function setFilt(f, btn) {
  filt = f;
  document.querySelectorAll('#ctrl-bar .pill').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderList();
}

function setSort(s, el) {
  sortMode = s;
  randomOrder = null;
  document.querySelectorAll('#filter-bar .chip[data-sort]').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  renderList();
}

function setTag(t, el) {
  tagFilt = t;
  document.querySelectorAll('#filter-bar .chip[data-tag]').forEach(c => c.classList.remove('on', 'tag-on'));
  if (el) {
    el.classList.add(t === 'all' ? 'on' : 'tag-on');
  } else {
    const found = document.querySelector(`#filter-bar .chip[data-tag="${t}"]`);
    if (found) found.classList.add('tag-on');
  }
  renderList();
  showView('songs');
}

function doSearch() {
  renderList();
}

// ═══════════════════════════════════════════════════════
// NAVEGACIÓN DE VISTAS
// ═══════════════════════════════════════════════════════

function showView(v) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('on'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('on'));
  document.getElementById('v-' + v).classList.add('on');
  document.getElementById('nb-' + v).classList.add('on');
  if (v === 'admin') adminRenderTable();
  const hb = document.getElementById('hamburger');
  if (hb) hb.style.display = 'none';
}

// ═══════════════════════════════════════════════════════
// EDITOR
// ═══════════════════════════════════════════════════════

function buildChordToolbar() {
  const tb = document.getElementById('chord-toolbar');
  tb.innerHTML = '';
  TOOLBAR_CHORDS.forEach((group, gi) => {
    if (gi > 0) {
      const sep = document.createElement('div');
      sep.className = 'tb-sep';
      tb.appendChild(sep);
    }
    group.forEach(chord => {
      const btn = document.createElement('button');
      btn.className = 'ck-btn';
      btn.title = TOOLBAR_LABELS[gi];
      const isSpecial = ['sus4', 'sus2', 'add9', 'dim', 'aug'].includes(chord);
      btn.textContent = chord;
      btn.onclick = () => {
        const ta = document.getElementById('ed-content');
        const start = ta.selectionStart;
        const before = ta.value.slice(0, start);
        const after  = ta.value.slice(ta.selectionEnd);
        let insert;
        if (isSpecial) {
          const prevChord = before.match(/\[([A-G][b#]?(?:m|M|maj)?\d*)\]$/);
          if (prevChord) {
            const newBefore = before.slice(0, before.length - prevChord[0].length);
            const newChord  = '[' + prevChord[1] + chord + ']';
            ta.value = newBefore + newChord + after;
            ta.selectionStart = ta.selectionEnd = newBefore.length + newChord.length;
            ta.focus();
            edPreviewUpdate();
            return;
          }
          insert = chord;
        } else {
          insert = '[' + chord + ']';
        }
        ta.value = before + insert + after;
        ta.selectionStart = ta.selectionEnd = start + insert.length;
        ta.focus();
        edPreviewUpdate();
      };
      tb.appendChild(btn);
    });
  });
}

function editorSave() {
  const title = document.getElementById('ed-title').value.trim().toUpperCase();
  if (!title) {
    toast('El título es obligatorio');
    document.getElementById('ed-title').focus();
    return;
  }
  const sp = document.getElementById('ed-spotify').value.trim();
  const yt = document.getElementById('ed-youtube').value.trim();
  const rawContent = document.getElementById('ed-content').value;

  const data = {
    title,
    artist:   document.getElementById('ed-artist').value.trim(),
    composer: document.getElementById('ed-composer').value.trim(),
    key:      document.getElementById('ed-key').value.trim(),
    spotify:  sp,  spId: spId(sp),
    youtube:  yt,  ytId: ytId(yt),
    content:  Migrator.migrate(rawContent),
    tags:     [...edTags],
    source: '', srcTag: 'base', srcColor: '#9e9e9e', fav: false
  };

  if (edSongId) {
    const s = songs.find(x => x.id === edSongId);
    if (s) {
      Object.assign(s, data);
      s.id = edSongId;
      // Si la canción editada está abierta, refrescar la vista
      if (curId === edSongId) {
        blocks = Parser.parse(Migrator.migrate(s.content));
        document.getElementById('s-title').textContent    = s.title;
        document.getElementById('s-artist').textContent   = s.artist || '';
        document.getElementById('s-composer').textContent = s.composer ? 'Composición: ' + s.composer : '';
        document.getElementById('s-tags-row').innerHTML   = (s.tags || [])
          .map(t => `<span class="s-tag" onclick="setTag('${t}',null)">${t}</span>`)
          .join('');
        document.getElementById('td').textContent = s.key || '—';
        renderBody();
        renderLinks(s);
      }
    }
  } else {
    data.id = slugify(title) || 'song-' + Date.now();
    songs.push(data);
  }

  // Guardar automáticamente en localStorage
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(songs));
    document.getElementById('admin-changed').style.display = 'none';
  } catch (e) {
    markUnsaved();
  }
  editorClose();
  adminRenderTable();
  renderList();
  toast(`✓ "${title}" guardada`);
}

function editorDelete() {
  const s = songs.find(x => x.id === edSongId);
  if (!s) return;
  if (!confirm(`¿Eliminar "${s.title}"?`)) return;
  songs = songs.filter(x => x.id !== edSongId);
  if (curId === edSongId) {
    curId = null;
    document.getElementById('empty').style.display    = 'flex';
    document.getElementById('song-view').style.display = 'none';
  }
  // Guardar automáticamente en localStorage
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(songs));
    document.getElementById('admin-changed').style.display = 'none';
  } catch (e) {
    markUnsaved();
  }
  editorClose();
  adminRenderTable();
  renderList();
  toast(`"${s.title}" eliminada`);
}

function edPreviewUpdate() {
  const raw = document.getElementById('ed-content').value;
  const cp  = Migrator.migrate(raw);
  const bl  = Parser.parse(cp);
  const container = document.getElementById('ed-preview-body');
  container.innerHTML = '';
  container.appendChild(Renderer.render(bl, 0, false));

  // Validación de sintaxis ChordPro
  const status = document.getElementById('ed-status');
  const ta     = document.getElementById('ed-content');
  const malformed = /\[[^\]]{0,20}$|\][^\[]*\[/.test(raw) ||
    /[A-G][b#]?[M]\]|\[[A-G][b#]?[M][^\]]*$/.test(raw);
  const hasChords = /\[[A-G][^\]]{0,8}\]/.test(cp);

  if (!raw.trim()) {
    status.className = '';
    status.style.display = 'none';
    ta.classList.remove('has-error');
    return;
  }
  if (malformed) {
    status.textContent = '⚠ Revisar corchetes';
    status.className = 'err';
    ta.classList.add('has-error');
  } else if (hasChords) {
    status.textContent = '✓ ChordPro';
    status.className = 'ok';
    ta.classList.remove('has-error');
  } else {
    status.textContent = 'Solo letra';
    status.className = '';
    status.style.display = 'none';
    ta.classList.remove('has-error');
  }
}

// ═══════════════════════════════════════════════════════
// ADMIN — TABLA
// ═══════════════════════════════════════════════════════

function adminRenderTable() {
  const q = deacc(document.getElementById('admin-si').value);
  let vis = songs.filter(s =>
    !q ||
    deacc(s.title).includes(q) ||
    deacc(s.artist || '').includes(q)
  );
  vis.sort((a, b) => {
    const va = deacc(a[adminSortKey] || '');
    const vb = deacc(b[adminSortKey] || '');
    return adminSortAsc ? va.localeCompare(vb, 'es') : vb.localeCompare(va, 'es');
  });

  document.getElementById('admin-count').textContent = vis.length + ' / ' + songs.length + ' canciones';
  const tbody = document.getElementById('admin-tbody');
  tbody.innerHTML = '';

  vis.forEach((s, i) => {
    const tr = document.createElement('tr');
    const tagsHTML = (s.tags || []).map(t => `<span class="td-tag">${t}</span>`).join('');
    const spLink   = s.spotify
      ? `<a class="lbadge sp" href="${s.spotify}" target="_blank" style="font-size:10px;padding:2px 7px">♫</a>`
      : '';
    const ytLink   = s.youtube
      ? `<a class="lbadge yt" href="${s.youtube}" target="_blank" style="font-size:10px;padding:2px 7px">▶</a>`
      : '';
    tr.innerHTML =
      `<td><div class="td-title" title="${esc(s.title)}">${i + 1}. ${esc(s.title)}</div>` +
      `<div class="td-sub">${esc(s.artist) || '—'}</div></td>` +
      `<td class="td-sub">${esc(s.composer) || '—'}</td>` +
      `<td class="td-key">${esc(s.key) || '—'}</td>` +
      `<td><div class="td-tags">${tagsHTML}</div></td>` +
      `<td>${spLink} ${ytLink}</td>` +
      `<td><button class="row-btn" onclick="editorOpen('${s.id}')">Editar</button>` +
      `<button class="row-btn row-del" onclick="adminDelRow('${s.id}')">✕</button></td>`;
    tbody.appendChild(tr);
  });
}

function adminSort(key) {
  if (adminSortKey === key) {
    adminSortAsc = !adminSortAsc;
  } else {
    adminSortKey = key;
    adminSortAsc = true;
  }
  adminRenderTable();
}

function adminDelRow(id) {
  const s = songs.find(x => x.id === id);
  if (!s) return;
  if (!confirm(`¿Eliminar "${s.title}"?`)) return;
  songs = songs.filter(x => x.id !== id);
  if (curId === id) {
    curId = null;
    document.getElementById('empty').style.display    = 'flex';
    document.getElementById('song-view').style.display = 'none';
  }
  markUnsaved();
  adminRenderTable();
  renderList();
  toast(`"${s.title}" eliminada`);
}

// ═══════════════════════════════════════════════════════
// ADMIN — PERSISTENCIA
// ═══════════════════════════════════════════════════════

function markUnsaved() {
  document.getElementById('admin-changed').style.display = 'inline';
}

function adminSaveLS() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(songs));
    document.getElementById('admin-changed').style.display = 'none';
    toast('✓ Guardado en el navegador');
  } catch (e) {
    toast('✗ Error: ' + e.message);
  }
}

function adminExport() {
  const blob = new Blob([JSON.stringify(songs, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ruah_cancionero_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('✓ JSON exportado');
}

function adminImport(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = e => {
    try {
      const p = JSON.parse(e.target.result);
      if (!Array.isArray(p)) throw new Error('No es un array');
      if (!confirm(`¿Importar ${p.length} canciones? Reemplazará el cancionero actual.`)) return;
      songs = p.map(s => ({
        ...s,
        spId: spId(s.spotify || ''),
        ytId: ytId(s.youtube || ''),
        tags: s.tags || []
      }));
      adminSaveLS();
      adminRenderTable();
      renderList();
      toast(`✓ ${songs.length} canciones importadas`);
    } catch (e) {
      toast('✗ ' + e.message);
    }
  };
  r.readAsText(file);
  ev.target.value = '';
}

function adminResetConfirm() {
  if (!confirm('¿Restaurar cancionero original? Se perderán los cambios guardados en este navegador.')) return;
  localStorage.removeItem(LS_KEY);
  songs = [...SD].map(s => ({ ...s, tags: s.tags || [] }));
  document.getElementById('admin-changed').style.display = 'none';
  adminRenderTable();
  renderList();
  toast('✓ Restaurado');
}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════

function init() {
  try {
    initState(SONGS_DATA);    // datos embebidos en songs_data.js
    buildTagChips();          // misc.js: pinta los chips de tags en el filtro
    buildChordToolbar();      // toolbar del editor
    renderList();             // lista inicial
    showView('home');         // vista de inicio (primero mostrar)
    buildPrayers();           // sección de oraciones (después de mostrar el DOM)
  } catch (e) {
    console.error('[RUAH] Error al cargar:', e);
  }
}

document.addEventListener('DOMContentLoaded', init);
