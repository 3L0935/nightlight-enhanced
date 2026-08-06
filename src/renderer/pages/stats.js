// ── Community Stats Page ──
// Fetches aggregate perk/build usage from NightLight's public API
// and resolves numeric ids to names/icons/descriptions via nl-data.json.

let _nlData = null;
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
  const json = await window.nightlight.fetchCommunityStats();
  if (!json || json.status !== 'success') throw new Error(json?.error?.message || 'Stats API error');
  _statsCache = json.data;
  return _statsCache;
}

// ── Perk tooltip: renders description HTML with level-tinted tunable values ──
function perkTooltipContent(perkId) {
  const perk = _nlData?.perks?.[perkId];
  const name = perk?.name || 'Unknown';
  if (!perk?.desc_html) {
    return `<div class="pt-name">${name}</div><div class="pt-desc">No description available.</div>`;
  }
  // Convert the scraped description HTML: wrap level-1/2/3 values in colored spans.
  // Use [\s\S]*? to tolerate nested tags inside the tunable span content.
  let html = perk.desc_html
    .replace(/<span class="tunable level-1">([\s\S]*?)<\/span>/g, '<span class="pt-lvl pt-l1">$1</span>')
    .replace(/<span class="tunable level-2">([\s\S]*?)<\/span>/g, '<span class="pt-lvl pt-l2">$1</span>')
    .replace(/<span class="tunable level-3">([\s\S]*?)<\/span>/g, '<span class="pt-lvl pt-l3">$1</span>')
    .replace(/<span class="tunable">([\s\S]*?)<\/span>/g, '<span class="pt-static">$1</span>')
    // keep Highlight spans but neutralize their class so our CSS controls the look
    .replace(/class="Highlight\d*"/g, '')
    // FlavorText -> italic muted
    .replace(/<span class="FlavorText">/g, '<span class="pt-flavor">')
    .replace(/<\/p><p>/g, '<br>')
    .replace(/<\/p>/g, '')
    .replace(/<p>/g, '');
  // strip <br> inside flavor at start/end, clean
  return `<div class="pt-name">${name}</div><div class="pt-desc">${html}</div>`;
}

function perkTooltip(perkId, inner) {
  return `<div class="stat-tip" data-perk="${perkId}">${inner}</div>`;
}

// ── Top perks ──
function renderTopPerks(perks) {
  if (!perks || perks.length === 0) return '<div class="empty-state">No data yet.</div>';
  return perks.map((p, i) => {
    const img = perkImage(p.perk_id, 85);
    return perkTooltip(p.perk_id, `
      <div class="stat-perk-row">
        <span class="stat-rank">${i + 1}</span>
        ${img ? `<img class="stat-perk-img" src="${img}" alt="${perkName(p.perk_id)}" loading="lazy" />` : '<span class="stat-perk-img stat-perk-img-none"></span>'}
        <div class="stat-perk-body">
          <div class="stat-perk-name">${perkName(p.perk_id)}</div>
          <div class="stat-perk-pct">${p.pct}%</div>
          ${pctBar(p.pct)}
        </div>
      </div>`);
  }).join('');
}

// ── Characters (survivors/killers) with perk icons ──
function renderTopChars(chars) {
  if (!chars || chars.length === 0) return '<div class="empty-state">No data yet.</div>';
  return `<div class="char-grid">` + chars.map((c) => {
    const img = charPortrait(c.character_id);
    const perks = (c.perks || []).slice(0, 4).map(p => {
      const pimg = perkImage(p.perk_id, 85);
      const n = perkName(p.perk_id);
      return pimg
        ? perkTooltip(p.perk_id, `<img class="stat-mini-perk" src="${pimg}" alt="${n}" loading="lazy" />`)
        : '<span class="stat-mini-perk stat-mini-perk-empty"></span>';
    }).join('');
    return `
      <div class="stat-char">
        ${img ? `<img class="stat-char-img" src="${img}" alt="${charName(c.character_id)}" loading="lazy" />` : ''}
        <div class="stat-char-body">
          <div class="stat-char-name">${charName(c.character_id)}</div>
          <div class="stat-char-perks">${perks}</div>
        </div>
        <div class="stat-char-total">${c.total}%</div>
      </div>`;
  }).join('') + `</div>`;
}

// ── Builds (global survivor/killer) ──
function renderBuilds(builds, role) {
  if (!builds || builds.length === 0) return '<div class="empty-state">No data yet.</div>';
  return builds.map((b, i) => {
    const icons = b.build.map(pid => {
      if (pid === -1) return `<span class="stat-build-perk stat-build-perk-empty"></span>`;
      const img = perkImage(pid, 85);
      const n = perkName(pid);
      return perkTooltip(pid, img
        ? `<img class="stat-build-perk" src="${img}" alt="${n}" loading="lazy" />`
        : `<span class="stat-build-perk stat-build-perk-empty"></span>`);
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

// ── Builds by killer (from nl-data.json) ──
function renderKillerBuilds(killerId) {
  const k = _nlData?.killers?.[killerId];
  const builds = k?.builds || [];
  if (!builds || builds.length === 0) return '<div class="empty-state">No build data for this killer.</div>';
  return builds.slice(0, 8).map((b, i) => {
    const icons = b.perks.map(pid => {
      if (pid === -1) return `<span class="stat-build-perk stat-build-perk-empty"></span>`;
      const img = perkImage(pid, 85);
      const n = perkName(pid);
      return perkTooltip(pid, img
        ? `<img class="stat-build-perk" src="${img}" alt="${n}" loading="lazy" />`
        : `<span class="stat-build-perk stat-build-perk-empty"></span>`);
    }).join('');
    return `
      <div class="stat-build">
        <span class="stat-rank">${i + 1}</span>
        <div class="stat-build-icons">${icons}</div>
        <div class="stat-build-meta">
          <div class="stat-build-usage">${b.pct}%</div>
          <div class="stat-build-rate">${b.kill_rate}% kill · ${b.survivors} games</div>
        </div>
      </div>`;
  }).join('');
}

// ── Killer selector (dropdown of top killers with build data) ──
function killerSelectorHtml() {
  const killers = Object.values(_nlData?.killers || {})
    .filter(k => k.builds && k.builds.length)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  if (killers.length === 0) return '';
  const options = killers.map(k =>
    `<option value="${k.id}">${k.name}</option>`).join('');
  return `
    <div class="killer-select-wrap">
      <label class="presets-label" for="killer-build-select">${icon('chart')} Killer Builds</label>
      <select id="killer-build-select" class="cfg-select cfg-input">${options}</select>
    </div>`;
}

function pctBar(pct) {
  return `<div class="pct-track"><div class="pct-fill" style="width:${Math.min(pct, 100)}%"></div></div>`;
}

function renderStats(data) {
  const meta = $('#stats-meta');
  meta.innerHTML = `
    <span class="stats-patch">Since patch ${data.stat_start_patch || '?'}</span>
    <span class="stats-note">Aggregated from random players in community-submitted matches. Updated daily at 4PM UTC.</span>
  `;

  const content = $('#stats-content');
  content.innerHTML = `
    <div class="stats-section">
      <div class="stats-section-title">Most Used Perks</div>
      <div class="stats-section-sub">Top 10 perks by usage rate across community matches.</div>
      <div class="stats-cols">
        <div class="stats-card">
          <h3>Survivor Perks</h3>
          ${renderTopPerks(data.top_survivor_perks)}
        </div>
        <div class="stats-card">
          <h3>Killer Perks</h3>
          ${renderTopPerks(data.top_killer_perks)}
        </div>
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">Characters by Perk Usage</div>
      <div class="stats-section-sub">Most played survivors and killers, with their signature perks.</div>
      <div class="stats-cols">
        <div class="stats-card">
          <h3>Survivors</h3>
          ${renderTopChars(data.top_survivors)}
        </div>
        <div class="stats-card">
          <h3>Killers</h3>
          ${renderTopChars(data.top_killers)}
        </div>
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">Most Seen Builds</div>
      <div class="stats-section-sub">Most frequent perk combinations in community matches.</div>
      <div class="stats-cols">
        <div class="stats-card">
          <h3>Survivor Builds</h3>
          ${renderBuilds(data.top_survivor_builds, 'survivor')}
        </div>
        <div class="stats-card">
          <h3>Killer Builds</h3>
          ${renderBuilds(data.top_killer_builds, 'killer')}
        </div>
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">Builds by Killer</div>
      <div class="stats-section-sub">Pick a killer to see their most popular builds.</div>
      <div class="stats-card">
        ${killerSelectorHtml()}
        <div id="killer-builds-body"></div>
      </div>
    </div>`;

  const sel = $('#killer-build-select');
  if (sel) {
    const show = (id) => {
      $('#killer-builds-body').innerHTML = `<h3 class="kb-title">${charName(parseInt(id))}</h3>` + renderKillerBuilds(parseInt(id));
      bindTooltips(content);
    };
    sel.addEventListener('change', () => show(sel.value));
    show(sel.value);
  }

  // Bind hover tooltips on all perk elements in the rendered stats
  bindTooltips(content);
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

// ── Tooltip engine: a single shared tooltip, shown on hover over .stat-tip ──
let _tipEl = null;
function ensureTip() {
  if (!_tipEl) {
    _tipEl = document.createElement('div');
    _tipEl.className = 'perk-tooltip';
    document.body.appendChild(_tipEl);
  }
  return _tipEl;
}

function bindTooltips(container) {
  const tip = ensureTip();
  container.querySelectorAll('.stat-tip').forEach(el => {
    el.addEventListener('mouseenter', (e) => {
      const perkId = el.dataset.perk;
      tip.innerHTML = perkTooltipContent(perkId);
      tip.classList.add('visible');
      positionTip(el, tip);
    });
    el.addEventListener('mousemove', () => positionTip(el, tip));
    el.addEventListener('mouseleave', () => tip.classList.remove('visible'));
  });
}

function positionTip(anchor, tip) {
  const r = anchor.getBoundingClientRect();
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  // Prefer right of the anchor; fall back to left if it would overflow.
  let x = r.right + 12;
  if (x + tw > window.innerWidth - 8) x = r.left - tw - 12;
  if (x < 8) x = r.left;
  // Vertically center against the anchor, clamped to viewport.
  let y = r.top + r.height / 2 - th / 2;
  if (y + th > window.innerHeight - 8) y = window.innerHeight - th - 8;
  if (y < 8) y = 8;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}

document.addEventListener('DOMContentLoaded', () => {
  $('#nav-icon-stats').innerHTML = icon('chart');
  $('#stats-refresh').innerHTML = `${icon('refresh')} Refresh`;
  $('#stats-refresh').addEventListener('click', () => loadStats(true));
  document.querySelector('.nav-item[data-page="stats"]').addEventListener('click', () => {
    setTimeout(() => loadStats(), 50);
  });
});
