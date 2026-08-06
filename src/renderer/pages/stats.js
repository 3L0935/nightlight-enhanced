// ── Community Stats Page ──
// Fetches aggregate perk/build usage from NightLight's public API
// and resolves numeric ids to names/icons via the bundled nl-data.json map.

let _nlData = null; // { perks: {id: {name, icon}}, survivors: {}, killers: {} }
let _statsCache = null;

const CDN = 'https://cdn.nightlight.gg/img';

function perkImage(id, size = '') {
  const p = _nlData?.perks?.[id];
  if (!p || !p.icon) return null;
  const suffix = size ? `-${size}` : '';
  return `${CDN}/perks/${p.icon}${suffix}.png`;
}
function perkName(id) {
  return _nlData?.perks?.[id]?.name || 'Unknown';
}
function charName(id) {
  return _nlData?.survivors?.[id]?.name || _nlData?.killers?.[id]?.name || 'Unknown';
}
function charPortrait(id) {
  const c = _nlData?.survivors?.[id] || _nlData?.killers?.[id];
  return c ? `${CDN}/portraits/${c.portrait}` : null;
}
function isKiller(id) {
  return !!_nlData?.killers?.[id];
}

async function loadNlData() {
  if (_nlData) return _nlData;
  try {
    const res = await fetch('nl-data.json');
    _nlData = await res.json();
  } catch (e) {
    console.error('Failed to load nl-data.json:', e);
    _nlData = { perks: {}, survivors: {}, killers: {} };
  }
  return _nlData;
}

async function fetchStats() {
  if (_statsCache) return _statsCache;
  const res = await fetch('https://nightlight.gg/api/v1/stats/global/perks_and_builds', {
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== 'success') throw new Error(json.error?.message || 'Stats API error');
  _statsCache = json.data;
  return _statsCache;
}

function pctBar(pct) {
  return `<div class="pct-track"><div class="pct-fill" style="width:${Math.min(pct, 100)}%"></div></div>`;
}

function renderTopPerks(perks, role) {
  if (!perks || perks.length === 0) return '<div class="empty-state">No data yet.</div>';
  return perks.map((p, i) => {
    const img = perkImage(p.perk_id, 85);
    return `
      <div class="stat-perk-row">
        <span class="stat-rank">${i + 1}</span>
        ${img ? `<img class="stat-perk-img" src="${img}" alt="${perkName(p.perk_id)}" loading="lazy" />` : '<span class="stat-perk-img stat-perk-img-none"></span>'}
        <div class="stat-perk-body">
          <div class="stat-perk-name">${perkName(p.perk_id)}</div>
          <div class="stat-perk-pct">${p.pct}%</div>
          ${pctBar(p.pct)}
        </div>
      </div>`;
  }).join('');
}

function renderTopChars(chars, role) {
  if (!chars || chars.length === 0) return '<div class="empty-state">No data yet.</div>';
  return chars.map((c) => {
    const img = charPortrait(c.character_id);
    const perks = (c.perks || []).slice(0, 4).map(p => {
      const pimg = perkImage(p.perk_id, 85);
      const n = perkName(p.perk_id);
      return pimg
        ? `<img class="stat-mini-perk" src="${pimg}" title="${n} ${p.pct}%" alt="${n}" loading="lazy" />`
        : '';
    }).join('');
    return `
      <div class="stat-char">
        ${img ? `<img class="stat-char-img" src="${img}" alt="${charName(c.character_id)}" loading="lazy" />` : ''}
        <div class="stat-char-body">
          <div class="stat-char-name">${charName(c.character_id)}</div>
          <div class="stat-char-total">${c.total}%</div>
        </div>
        <div class="stat-char-perks">${perks}</div>
      </div>`;
  }).join('');
}

function renderBuilds(builds, role) {
  if (!builds || builds.length === 0) return '<div class="empty-state">No data yet.</div>';
  return builds.map((b, i) => {
    const icons = b.build.map(pid => {
      const img = perkImage(pid, 85);
      const n = perkName(pid);
      return img
        ? `<img class="stat-build-perk" src="${img}" title="${n}" alt="${n}" loading="lazy" />`
        : '';
    }).join('');
    const metric = role === 'killer'
      ? `${Math.round((1000 * (b.survivors - b.escapes)) / b.survivors) / 10}% kill`
      : `${Math.round((1000 * b.escapes) / b.survivors) / 10}% escape`;
    return `
      <div class="stat-build">
        <span class="stat-rank">${i + 1}</span>
        <div class="stat-build-icons">${icons}</div>
        <div class="stat-build-meta">
          <div class="stat-build-usage">${b.percentage}%</div>
          <div class="stat-build-rate">${metric} · ${b.survivors.toLocaleString()} games</div>
        </div>
      </div>`;
  }).join('');
}

function renderStats(data) {
  const meta = $('#stats-meta');
  meta.innerHTML = `
    <span class="stats-patch">Since patch ${data.stat_start_patch || '?'}</span>
    <span class="stats-note">Aggregated from random players in community-submitted matches. Updated daily at 4PM UTC.</span>
  `;

  const content = $('#stats-content');
  content.innerHTML = `
    <div class="stats-grid">
      <div class="stats-card">
        <h3>Most Used Survivor Perks</h3>
        ${renderTopPerks(data.top_survivor_perks, 'survivor')}
      </div>
      <div class="stats-card">
        <h3>Most Used Killer Perks</h3>
        ${renderTopPerks(data.top_killer_perks, 'killer')}
      </div>
      <div class="stats-card">
        <h3>Survivors by Perk Usage</h3>
        ${renderTopChars(data.top_survivors, 'survivor')}
      </div>
      <div class="stats-card">
        <h3>Killers by Perk Usage</h3>
        ${renderTopChars(data.top_killers, 'killer')}
      </div>
      <div class="stats-card stats-card-wide">
        <h3>Most Seen Survivor Builds</h3>
        ${renderBuilds(data.top_survivor_builds, 'survivor')}
      </div>
      <div class="stats-card stats-card-wide">
        <h3>Most Seen Killer Builds</h3>
        ${renderBuilds(data.top_killer_builds, 'killer')}
      </div>
    </div>`;
}

async function loadStats(force = false) {
  const content = $('#stats-content');
  const meta = $('#stats-meta');
  if (force) _statsCache = null;
  try {
    await loadNlData();
    content.innerHTML = '<div class="loading">Loading community stats...</div>';
    meta.innerHTML = '';
    const data = await fetchStats();
    renderStats(data);
  } catch (err) {
    content.innerHTML = `<div class="empty-state">${icon('alertCircle')} Failed to load stats: ${err.message}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('#nav-icon-stats').innerHTML = icon('chart');
  $('#stats-refresh').innerHTML = `${icon('refresh')} Refresh`;
  $('#stats-refresh').addEventListener('click', () => loadStats(true));
  document.querySelector('.nav-item[data-page="stats"]').addEventListener('click', () => {
    setTimeout(() => loadStats(), 50);
  });
});
