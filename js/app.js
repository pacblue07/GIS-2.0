// GIS 2.0 prototype: map-first browse of the building database.
// Modelled on the Photo Catalog map: one result set drives the map, the place list, the year timeline and the table.
(function () {
  const ALL = window.GIS_BUILDINGS || [];
  const FAM = {
    'Elastomeric': 'var(--f-elast)', 'Sliding': 'var(--f-slide)', 'Hybrid (elastomeric + sliding)': 'var(--f-hybrid)',
    'Rolling': 'var(--f-roll)', 'Hybrid (elastomeric + rolling)': 'var(--f-roll)', 'Other': 'var(--f-other)', '': 'var(--f-none)'
  };
  const famLabel = f => f || 'Not known / dampers only';
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v.slice(4, -1)).trim();
  const DEV = {
    LRB: 'Lead-rubber bearing', HDRB: 'High-damping rubber bearing', RB: 'Natural rubber bearing', NEO: 'Neoprene bearing',
    SB: 'Flat sliding bearing', CSS: 'Curved surface slider', FPS: 'Friction pendulum', TFP: 'Triple friction pendulum',
    CLB: 'Cross-linear bearing', ROLL: 'Roller / ball', SPR: 'Helical spring', SP: 'Sleeved piles', SR: 'SR',
    VD: 'Viscous damper', OD: 'Oil damper', VED: 'Viscoelastic damper', SD: 'Steel damper', Sb: 'Steel bar damper',
    LD: 'Lead damper', LED: 'Lead extrusion damper', FD: 'Friction damper', BRB: 'Buckling-restrained brace', SMA: 'Shape-memory alloy', STU: 'Shock transmission unit'
  };
  const devs = b => (b.dev || '').split(' + ').filter(Boolean);
  const city = b => b.gm || (b.loc && b.loc !== '?' ? b.loc : 'Location not given');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = n => n == null ? '' : Number(n).toLocaleString('en-US');

  // ---- state
  const FACETS = [
    { key: 'fam', title: 'Isolation system', get: b => [b.fam || ''], label: famLabel, swatch: true },
    { key: 'dev', title: 'Devices', get: devs, label: d => `${d} <span class="mute">${DEV[d] || ''}</span>`, top: 10 },
    { key: 'c', title: 'Country', get: b => [b.c], top: 8 },
    { key: 'ug', title: 'Use', get: b => [b.ug] },
    { key: 'nr', title: 'New or retrofit', get: b => [b.nr || 'Not stated'] },
    { key: 'cls', title: 'Structure', get: b => [b.cls], label: v => esc(v[0].toUpperCase() + v.slice(1)) },
    { key: 'dmp', title: 'Supplemental damping', get: b => [b.dmp ? 'Yes' : 'No'] }
  ];
  const S = { q: '', sel: {}, y0: null, y1: null, place: null, sort: { k: 'y', d: 1 }, expanded: {} };
  FACETS.forEach(f => S.sel[f.key] = new Set());

  function match(b, skip) {
    if (S.q) {
      const hay = [b.n, b.c, b.loc, b.gm, b.use, b.ug, b.dev, b.raw, b.fam, b.id].join(' ').toLowerCase();
      if (!S.q.split(/\s+/).every(w => hay.includes(w))) return false;
    }
    for (const f of FACETS) {
      if (f.key === skip) continue;
      const s = S.sel[f.key];
      if (s.size && !f.get(b).some(v => s.has(v))) return false;
    }
    if (skip !== 'year' && S.y0 != null && (b.y == null || b.y < S.y0 || b.y > S.y1)) return false;
    if (skip !== 'place' && S.place && (b.c !== S.place.c || (S.place.city && city(b) !== S.place.city))) return false;
    return true;
  }

  // ---- map
  const map = L.map('map', { worldCopyJump: true, zoomControl: true, minZoom: 1, maxZoom: 18 }).setView([25, 20], 2);
  // Street tiles: probe each source before using it. Some providers (CARTO) answer pages opened
  // from disk with an "API key required" picture instead of an error, so a plain tileerror
  // fallback never fires. Same approach as the Photo Catalog map.
  const ESRI = { name: 'Esri', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    opt: { maxZoom: 19 }, attr: 'Tiles © Esri and its data providers',
    foot: 'Street map tiles © <a href="https://www.esri.com">Esri</a> and its data providers.' };
  const CARTO = { name: 'CARTO', url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    opt: { subdomains: 'abcd', maxZoom: 19 }, attr: '© OpenStreetMap contributors © CARTO',
    foot: 'Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, tiles © <a href="https://carto.com/attributions">CARTO</a>.' };
  const OSM = { name: 'OSM', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    opt: { maxZoom: 19 }, attr: '© OpenStreetMap contributors',
    foot: 'Map data and tiles © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors.' };
  const TILES = location.protocol === 'file:' ? [ESRI, CARTO, OSM] : [CARTO, ESRI, OSM];
  // offline base: country outlines under the street tiles, so the map still reads without internet
  // own pane below the tile pane (z 200), so street tiles cover the outlines once they load
  map.createPane('outline').style.zIndex = 150;
  if (window.GIS_WORLD) L.geoJSON(window.GIS_WORLD, { pane: 'outline', interactive: false, style: { color: '#9fb3c8', weight: .6, fillColor: '#f2f4f7', fillOpacity: 1 } }).addTo(map);
  const tileUrl = (src, z, x, y) => src.url.replace('{s}', (src.opt.subdomains || 'a')[0]).replace('{r}', '')
    .replace('{z}', z).replace('{x}', x).replace('{y}', y);
  async function fetchTile(src, z, x, y, signal) {
    const r = await fetch(tileUrl(src, z, x, y), { mode: 'cors', cache: 'no-store', signal });
    if (!r.ok || !/^image\//.test(r.headers.get('content-type') || '')) throw new Error('bad tile');
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.length < 200) throw new Error('tiny tile');
    return buf;
  }
  async function probe(src) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
    try {
      const [a, b] = await Promise.all([fetchTile(src, 2, 1, 1, ctl.signal), fetchTile(src, 2, 2, 1, ctl.signal)]);
      // a refusal page ("API key required") is the same picture for every tile
      return !(a.length === b.length && a.every((v, i) => v === b[i]));
    } catch (e) { return false; } finally { clearTimeout(t); }
  }
  (async () => {
    for (const src of TILES) {
      if (await probe(src)) {
        L.tileLayer(src.url, Object.assign({ attribution: src.attr }, src.opt)).addTo(map);
        const f = document.getElementById('tileattr'); if (f) f.innerHTML = src.foot;
        return;
      }
    }
    const note = L.control({ position: 'bottomleft' });
    note.onAdd = () => Object.assign(L.DomUtil.create('div', 'mapnote'), { textContent: 'Street map unavailable, showing country outlines.' });
    note.addTo(map);
    const f = document.getElementById('tileattr'); if (f) f.textContent = 'Country outlines from Natural Earth.';
  })();
  const newCluster = () => L.markerClusterGroup({ maxClusterRadius: 38, showCoverageOnHover: false, spiderfyOnMaxZoom: true });
  let cluster = newCluster();
  map.addLayer(cluster);
  const markers = new Map();
  ALL.forEach(b => {
    if (b.lat == null) return;
    const m = L.circleMarker([b.lat, b.lng], { radius: 7, weight: 1.5, color: '#fff', fillColor: css(FAM[b.fam || '']), fillOpacity: .95 });
    m.bindTooltip(`<b>${esc(b.n)}</b><br>${esc(city(b))}, ${esc(b.c)}${b.y ? ' · ' + b.y : ''}`);
    m.on('click', () => openCard(b));
    markers.set(b.id, m);
  });

  // ---- facets
  const facetsEl = document.getElementById('facets');
  function renderFacets() {
    facetsEl.innerHTML = '';
    for (const f of FACETS) {
      const counts = new Map();
      ALL.forEach(b => f.get(b).forEach(v => counts.set(v, (counts.get(v) || 0))));
      ALL.filter(b => match(b, f.key)).forEach(b => f.get(b).forEach(v => counts.set(v, counts.get(v) + 1)));
      let vals = [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(b[0]));
      const box = document.createElement('div'); box.className = 'facet';
      const sel = S.sel[f.key];
      box.innerHTML = `<h3><span>${f.title}</span>${sel.size ? `<button class="link" data-clear="${f.key}">clear</button>` : ''}</h3>`;
      const lim = f.top && !S.expanded[f.key] ? f.top : Infinity;
      vals.forEach(([v, n], i) => {
        if (i >= lim && !sel.has(v)) return;
        const lab = document.createElement('label');
        if (!n && !sel.has(v)) lab.className = 'zero';
        const sw = f.swatch ? `<span class="sw" style="background:${FAM[v] || 'var(--f-none)'}"></span>` : '';
        lab.innerHTML = `<input type="checkbox" ${sel.has(v) ? 'checked' : ''}>${sw}<span>${f.label ? f.label(v) : esc(v)}</span><span class="n">${n}</span>`;
        lab.querySelector('input').onchange = e => { e.target.checked ? sel.add(v) : sel.delete(v); update(); };
        box.appendChild(lab);
      });
      if (f.top && vals.length > f.top) {
        const more = document.createElement('button'); more.className = 'link more';
        more.textContent = S.expanded[f.key] ? 'show fewer' : `show all ${vals.length}`;
        more.onclick = () => { S.expanded[f.key] = !S.expanded[f.key]; renderFacets(); };
        box.appendChild(more);
      }
      facetsEl.appendChild(box);
    }
    facetsEl.querySelectorAll('[data-clear]').forEach(b => b.onclick = () => { S.sel[b.dataset.clear].clear(); update(); });
  }

  // ---- legend
  document.getElementById('legend').innerHTML = ['Elastomeric', 'Sliding', 'Hybrid (elastomeric + sliding)', 'Rolling', 'Other', '']
    .map(f => `<span><i style="background:${FAM[f]}"></i>${famLabel(f)}</span>`).join('');

  // ---- timeline
  const tl = document.getElementById('tl');
  const YEARS = ALL.map(b => b.y).filter(Boolean);
  const Y0 = Math.min(...YEARS), Y1 = Math.max(...YEARS);
  let drag = null;
  function renderTimeline() {
    const counts = {}, base = ALL.filter(b => match(b, 'year'));
    base.forEach(b => { if (b.y) counts[b.y] = (counts[b.y] || 0) + 1; });
    const max = Math.max(1, ...Object.values(counts));
    tl.innerHTML = '';
    for (let y = Y0; y <= Y1; y++) {
      const c = document.createElement('div');
      const inSel = S.y0 != null && y >= S.y0 && y <= S.y1;
      c.className = 'c' + (inSel ? ' sel' : '') + (S.y0 != null && !inSel ? ' off' : '');
      c.title = `${y}: ${counts[y] || 0} building${counts[y] === 1 ? '' : 's'}`;
      c.innerHTML = `<div class="bar" style="height:${(counts[y] || 0) / max * 100}%"></div>`;
      c.onmousedown = () => { drag = y; };
      c.onmouseenter = () => { if (drag != null) { S.y0 = Math.min(drag, y); S.y1 = Math.max(drag, y); renderTimeline(); } };
      c.onmouseup = () => { if (drag != null) { if (drag === y) { S.y0 = S.y1 = y; } drag = null; update(); } };
      tl.appendChild(c);
    }
    let ax = document.getElementById('tlax');
    if (!ax) { ax = document.createElement('div'); ax.id = 'tlax'; tl.after(ax); }
    const noYear = base.filter(b => !b.y).length;
    ax.innerHTML = `<span>${Y0}</span><span>${S.y0 != null ? (S.y0 === S.y1 ? S.y0 : S.y0 + '–' + S.y1) : ''}</span><span>${Y1}${noYear ? ` · ${noYear} with no year` : ''}</span>`;
    document.getElementById('tlclear').hidden = S.y0 == null;
  }
  document.addEventListener('mouseup', () => { if (drag != null) { drag = null; update(); } });
  document.getElementById('tlclear').onclick = () => { S.y0 = S.y1 = null; update(); };

  // ---- places
  const placesEl = document.getElementById('places');
  function renderPlaces(list) {
    const byC = new Map();
    ALL.filter(b => match(b, 'place')).forEach(b => {
      if (!byC.has(b.c)) byC.set(b.c, new Map());
      const m = byC.get(b.c); m.set(city(b), (m.get(city(b)) || 0) + 1);
    });
    const cs = [...byC.entries()].map(([c, m]) => [c, m, [...m.values()].reduce((a, b) => a + b, 0)]).sort((a, b) => b[2] - a[2]);
    placesEl.innerHTML = cs.map(([c, m, n]) => {
      const on = S.place && S.place.c === c;
      const cities = [...m.entries()].sort((a, b) => b[1] - a[1]);
      return `<div class="pl-c"><div data-c="${esc(c)}" class="${on && !S.place.city ? 'on-place' : ''}"><span>${esc(c)}</span><span class="n">${n}</span></div>` +
        (on || cs.length <= 3 ? cities.map(([ci, k]) => `<div class="pl-city ${on && S.place.city === ci ? 'on-place' : ''}" data-c="${esc(c)}" data-city="${esc(ci)}"><span>${esc(ci)}</span><span class="n">${k}</span></div>`).join('') : '') + '</div>';
    }).join('') || '<p class="mute">No places match.</p>';
    placesEl.querySelectorAll('[data-c]').forEach(el => el.onclick = () => {
      const c = el.dataset.c, ci = el.dataset.city || null;
      const same = S.place && S.place.c === c && S.place.city === ci;
      S.place = same ? (ci ? { c, city: null } : null) : { c, city: ci };
      update(true);
    });
  }

  // ---- table
  const COLS = [
    ['id', 'ID'], ['n', 'Name', 'wrap'], ['c', 'Country'], ['city', 'City'], ['y', 'Year'], ['use', 'Use'], ['nr', 'New / retrofit'],
    ['st', 'Stories'], ['a', 'Size (m²)'], ['fam', 'System'], ['dev', 'Devices'], ['ni', 'Isolators']
  ];
  const cell = (b, k) => k === 'city' ? city(b) : k === 'a' || k === 'ni' ? fmt(b[k]) : k === 'fam' ? `<span class="dot" style="background:${FAM[b.fam || '']}"></span>${esc(famLabel(b.fam))}` : esc(b[k] ?? '');
  const thead = document.querySelector('#tbl thead'), tbody = document.querySelector('#tbl tbody');
  function renderTable(list) {
    thead.innerHTML = '<tr>' + COLS.map(([k, h]) => `<th data-k="${k}" class="${S.sort.k === k ? 'sorted' + (S.sort.d < 0 ? ' desc' : '') : ''}">${h}</th>`).join('') + '</tr>';
    thead.querySelectorAll('th').forEach(th => th.onclick = () => { const k = th.dataset.k; S.sort = { k, d: S.sort.k === k ? -S.sort.d : 1 }; renderTable(current); });
    const k = S.sort.k, d = S.sort.d, val = b => k === 'city' ? city(b) : b[k];
    const rows = [...list].sort((a, b) => { const x = val(a), y = val(b); if (x == null || x === '') return 1; if (y == null || y === '') return -1; return (x > y ? 1 : x < y ? -1 : 0) * d; });
    tbody.innerHTML = rows.map(b => `<tr data-id="${b.id}">` + COLS.map(([k, , w]) => `<td class="${w || ''}">${cell(b, k)}</td>`).join('') + '</tr>').join('');
    tbody.querySelectorAll('tr').forEach(tr => tr.onclick = () => { const b = BYID.get(tr.dataset.id); openCard(b); focus(b); });
    document.getElementById('rescount').textContent = `${list.length} building${list.length === 1 ? '' : 's'}`;
  }
  const BYID = new Map(ALL.map(b => [b.id, b]));
  function focus(b) {
    const m = markers.get(b.id); if (!m) return;
    cluster.zoomToShowLayer(m, () => m.openTooltip());
    document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---- building card
  const card = document.getElementById('card');
  function openCard(b) {
    const row = (k, v) => v != null && v !== '' ? `<dt>${k}</dt><dd>${v}</dd>` : '';
    const devList = devs(b).map(d => `${d}${DEV[d] ? ` <span class="mute">(${DEV[d]})</span>` : ''}`).join('<br>');
    const flags = [];
    if (b.unc) flags.push('Isolator type is marked uncertain in the source.');
    if (b.inote) flags.push(`Isolators: ${esc(b.inote)}.`);
    if (b.gp && b.gp !== 'city') flags.push(`Map location: ${esc(b.gp)}.`);
    if (b.lat == null) flags.push('No location yet, so this building is not on the map.');
    card.innerHTML = `<button class="x" aria-label="Close">×</button>
      <h2 id="cardtitle">${esc(b.n)}</h2>
      <div class="mute">${esc(b.loc && b.loc !== '?' ? b.loc : city(b))}, ${esc(b.c)} · ${b.id}</div>
      <span class="tag" style="background:${FAM[b.fam || '']}">${esc(famLabel(b.fam))}</span>
      <dl>
        ${row('Year', b.y ? b.y + (b.yn ? ` <span class="mute">(${esc(b.yn)})</span>` : '') : esc(b.yn))}
        ${row('Use', esc(b.use))}
        ${row('New or retrofit', esc(b.nr))}
        ${row('Structure', b.cls !== 'building' ? esc(b.cls) : '')}
        ${row('Stories', esc(b.st))}
        ${row('Size', b.a ? fmt(b.a) + ' m²' : '')}
        ${row('Buildings', b.nb && b.nb != 1 ? esc(b.nb) : '')}
        ${row('Beds', esc(b.beds))}
        ${row('Devices', devList)}
        ${row('Device counts', esc(b.cnt))}
        ${row('No. of isolators', fmt(b.ni))}
        ${row('As recorded', esc(b.raw))}
        ${row('References', esc(b.ref).replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noopener">link</a>'))}
      </dl>
      ${flags.map(f => `<div class="flag">${f}</div>`).join('')}`;
    card.hidden = false;
    card.querySelector('.x').onclick = () => card.hidden = true;
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') card.hidden = true; });

  // ---- CSV
  document.getElementById('csv').onclick = () => {
    const H = ['ID', 'Name', 'Country', 'Location', 'Latitude', 'Longitude', 'Year', 'Use', 'New or retrofit', 'Stories', 'Size (m2)', 'System family', 'Devices', 'No. of isolators', 'Isolators (as recorded)'];
    const K = ['id', 'n', 'c', 'loc', 'lat', 'lng', 'y', 'use', 'nr', 'st', 'a', 'fam', 'dev', 'ni', 'raw'];
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const txt = [H.map(q).join(',')].concat(current.map(b => K.map(k => q(b[k])).join(','))).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + txt], { type: 'text/csv' }));
    a.download = 'gis-buildings.csv'; a.click();
  };

  // ---- update everything
  let current = ALL;
  function update(fit) {
    current = ALL.filter(b => match(b));
    map.removeLayer(cluster); cluster = newCluster(); map.addLayer(cluster);  // rebuilt each time: clearLayers() can hang in markercluster 1.5.3
    const shown = current.map(b => markers.get(b.id)).filter(Boolean);
    cluster.addLayers(shown);
    const off = current.length - shown.length;
    document.getElementById('count').textContent = `${current.length} of ${ALL.length} buildings` + (off ? ` · ${off} not on map (no location yet)` : '');
    renderFacets(); renderTimeline(); renderPlaces(); renderTable(current);
    if (shown.length && fit !== false) map.fitBounds(L.featureGroup(shown).getBounds().pad(0.15), { maxZoom: S.place && S.place.city ? 11 : 8 });
  }
  let qt;
  document.getElementById('q').oninput = e => { clearTimeout(qt); qt = setTimeout(() => { S.q = e.target.value.trim().toLowerCase(); update(); }, 200); };
  document.getElementById('reset').onclick = () => {
    S.q = ''; document.getElementById('q').value = ''; FACETS.forEach(f => S.sel[f.key].clear()); S.y0 = S.y1 = null; S.place = null; update();
  };
  const countries = new Set(ALL.map(b => b.c)).size;
  document.getElementById('summary').textContent =
    `${ALL.length} isolated buildings and structures in ${countries} countries, compiled by the Global Isolation Survey partners. Click a pin for details, or filter by system, device, country, use or year.`;
  update();
  // deep link from other pages: index.html#b=NZ-005 opens that building's card and zooms to it
  const hb = /^#b=([\w-]+)$/.exec(location.hash), hit = hb && ALL.find(b => b.id === hb[1]);
  if (hit) { openCard(hit); const m = markers.get(hit.id); if (m) map.setView(m.getLatLng(), 11); }
})();
