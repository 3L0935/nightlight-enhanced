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
  if (perkId === -1 || perkId === '-1') {
    return `<div class="pt-name">No Perk</div><div class="pt-desc">This build slot is empty.</div>`;
  }
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
      <div class="stat-char" data-char="${c.character_id}" title="Click to view details">
        ${img ? `<img class="stat-char-img" src="${img}" alt="${charName(c.character_id)}" loading="lazy" />` : ''}
        <div class="stat-char-body">
          <div class="stat-char-name">${charName(c.character_id)}</div>
          <div class="stat-char-perks">${perks}</div>
        </div>
        <div class="stat-char-total">${c.total}%</div>
      </div>`;
  }).join('') + `</div>`;
}

// ── Format power description: line breaks + bold SPECIAL sections ──
function formatPowerDesc(desc) {
  if (!desc) return '';
  // Escape HTML first
  let s = desc.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Bold the SPECIAL ... headings
  s = s.replace(/(SPECIAL [A-Z]+: [^\n]+)/g, '<b>$1</b>');
  // Convert newlines to <br>
  s = s.replace(/\n+/g, '<br>');
  return s;
}

// ── Character detail (focus view) ──
function renderCharDetail(charId) {
  const isK = !!_nlData?.killers?.[charId];
  const c = isK ? _nlData.killers[charId] : _nlData.survivors[charId];
  if (!c) return '<div class="empty-state">Character not found.</div>';
  const img = charPortrait(charId);
  const perks = (c.perks || []).map(pid => {
    const pimg = perkImage(pid, 85);
    const n = perkName(pid);
    return perkTooltip(pid, `<div class="char-detail-perk" data-perk-click="${pid}">
      ${pimg
        ? `<img class="stat-detail-perk" src="${pimg}" alt="${n}" loading="lazy" />`
        : `<img class="stat-detail-perk stat-build-perk-blank" src="img/blank.webp" alt="No perk" loading="lazy" />`}
      <span class="char-detail-perk-name">${n}</span>
    </div>`);
  }).join('');
  const history = c.history || [];
  const pickRate = c.pick_rate !== undefined ? `${c.pick_rate}%` : (c.total !== undefined ? `${c.total}%` : '—');
  const rateLabel = isK ? 'Kill Rate' : 'Escape Rate';
  const rateVal = isK ? (c.kill_rate !== undefined ? `${c.kill_rate}%` : '—') : (c.escape_rate !== undefined ? `${c.escape_rate}%` : '—');
  const bio = c.bio || 'No bio available.';
  const backStory = c.back_story || '';
  // Power icon for killers (local asset)
  const powerHtml = isK && c.power_icon
    ? `<div class="char-detail-power">
        <h4>Power</h4>
        <div class="char-detail-power-box">
          <img class="char-detail-power-img" src="img/powers/${c.power_icon}" alt="${c.power_name || c.name} power" loading="lazy" />
          <div class="char-detail-power-info">
            <div class="char-detail-power-name">${c.power_name || `${c.name.replace('The ', '')}'s Power`}</div>
            ${c.power_desc ? `<div class="char-detail-power-desc">${formatPowerDesc(c.power_desc)}</div>` : ''}
          </div>
        </div>
      </div>`
    : '';
  return `
    <div class="char-detail">
      <button class="btn btn-sm char-detail-back">${icon('arrowUp')} Back</button>
      <div class="char-detail-layout">
        <div class="char-detail-left">
          <div class="char-detail-head">
            ${img ? `<img class="char-detail-portrait" src="${img}" alt="${c.name}" />` : ''}
            <div class="char-detail-title">
              <div class="char-detail-name">${c.name}</div>
              <div class="char-detail-role">${isK ? 'Killer' : 'Survivor'}</div>
              <div class="char-detail-stats">
                <span class="cd-stat"><b>${pickRate}</b> Pick Rate</span>
                <span class="cd-stat"><b>${rateVal}</b> ${rateLabel}</span>
              </div>
            </div>
          </div>
          <div class="char-detail-bio">
            <h4>Bio</h4>
            <p>${bio}</p>
            ${backStory ? `<details class="char-detail-lore"><summary>Full Lore</summary><p>${backStory}</p></details>` : ''}
          </div>
        </div>
        <div class="char-detail-right">
          ${powerHtml}
          <div class="char-detail-perks">
            <h4>Perks</h4>
            <div class="char-detail-perks-row">${perks}</div>
          </div>
        </div>
      </div>
      <div class="char-detail-graph">
        <h4>Pick Rate Over Time</h4>
        ${renderPickGraph(history)}
      </div>
    </div>`;
}

// ── Pick rate line graph (SVG) with hover tooltip ──
function renderPickGraph(history) {
  if (!history || history.length < 2) return '<div class="empty-state">Not enough history data.</div>';
  const W = 600, H = 180, PAD = 30;
  // history is newest-first; reverse so the graph reads oldest → newest left→right
  const pts = history.slice().reverse().map(h => ({ x: h.end, y: h.pick_rate }));
  const maxY = Math.max(...pts.map(p => p.y), 1);
  const minY = Math.min(...pts.map(p => p.y), 0);
  const range = (maxY - minY) || 1;
  const n = pts.length;
  const px = (i) => PAD + (i / (n - 1)) * (W - 2 * PAD);
  const py = (v) => H - PAD - ((v - minY) / range) * (H - 2 * PAD);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(i).toFixed(1)} ${py(p.y).toFixed(1)}`).join(' ');
  const area = `${line} L ${px(n-1).toFixed(1)} ${H-PAD} L ${px(0).toFixed(1)} ${H-PAD} Z`;
  const labels = pts.filter((_, i) => i % Math.ceil(n / 6) === 0);
  // Hover points with data for tooltip
  const dots = pts.map((p, i) =>
    `<circle class="pick-dot" data-idx="${i}" data-val="${p.y}" data-date="${p.x}"
      cx="${px(i).toFixed(1)}" cy="${py(p.y).toFixed(1)}" r="3.5" fill="var(--accent)"/>`).join('');
  return `
    <div class="pick-graph-wrap">
      <svg class="pick-graph" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="pickgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${area}" fill="url(#pickgrad)"/>
        <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2"/>
        ${labels.map(p => {
          const i = pts.indexOf(p);
          return `<text x="${px(i)}" y="${H-8}" class="pick-graph-label">${p.x.slice(0,7)}</text>`;
        }).join('')}
        ${dots}
      </svg>
      <div class="pick-tooltip hidden"></div>
    </div>`;
}

// ── Builds (global survivor/killer) ──
function renderBuilds(builds, role) {
  if (!builds || builds.length === 0) return '<div class="empty-state">No data yet.</div>';
  return builds.map((b, i) => {
    const icons = b.build.map(pid => {
      if (pid === -1) return perkTooltip(-1, `<img class="stat-build-perk stat-build-perk-blank" src="img/blank.webp" alt="No perk" loading="lazy" />`);
      const img = perkImage(pid, 85);
      const n = perkName(pid);
      return perkTooltip(pid, img
        ? `<img class="stat-build-perk" src="${img}" alt="${n}" loading="lazy" />`
        : `<img class="stat-build-perk stat-build-perk-blank" src="img/blank.webp" alt="No perk" loading="lazy" />`);
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
      if (pid === -1) return perkTooltip(-1, `<img class="stat-build-perk stat-build-perk-blank" src="img/blank.webp" alt="No perk" loading="lazy" />`);
      const img = perkImage(pid, 85);
      const n = perkName(pid);
      return perkTooltip(pid, img
        ? `<img class="stat-build-perk" src="${img}" alt="${n}" loading="lazy" />`
        : `<img class="stat-build-perk stat-build-perk-blank" src="img/blank.webp" alt="No perk" loading="lazy" />`);
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

let _currentTab = 'perks';

function renderStats(data) {
  const meta = $('#stats-meta');
  meta.innerHTML = `
    <span class="stats-patch">Since patch ${data.stat_start_patch || '?'}</span>
    <span class="stats-note">Aggregated from random players in community-submitted matches. Updated daily at 4PM UTC.</span>
  `;
  renderTab(_currentTab, data);
}

function renderTab(tab, data) {
  const content = $('#stats-content');
  if (tab === 'perks') {
    content.innerHTML = `
      <div class="stats-section">
        <div class="stats-section-title">Most Used Perks</div>
        <div class="stats-section-sub">Top 10 perks by usage rate. Click a perk to see its popularity over time.</div>
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
      </div>`;
  } else if (tab === 'builds') {
    content.innerHTML = `
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
  } else if (tab === 'characters') {
    content.innerHTML = `
      <div class="stats-section">
        <div class="stats-section-title">Characters</div>
        <div class="stats-section-sub">Click a character to see their bio, perks, and pick rate over time.</div>
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
      </div>`;
    // Click a character to open detail view
    content.querySelectorAll('.stat-char[data-char]').forEach(el => {
      el.addEventListener('click', () => {
        const cid = el.dataset.char;
        content.innerHTML = renderCharDetail(cid);
        bindTooltips(content);
        bindCharDetail(content, data);
      });
    });
  }
  bindTooltips(content);
}

// ── Bind interactions in the character detail view ──
function bindCharDetail(content, data) {
  // Back button
  const back = content.querySelector('.char-detail-back');
  if (back) back.addEventListener('click', () => renderTab('characters', data));
  // Perk click → perk detail page
  content.querySelectorAll('[data-perk-click]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const pid = el.dataset.perkClick;
      content.innerHTML = renderPerkDetail(pid);
      bindTooltips(content);
      bindPerkDetail(content, data);
    });
  });
  // Graph hover tooltip
  const wrap = content.querySelector('.pick-graph-wrap');
  if (wrap) bindPickHover(wrap);
}

// ── Perk detail page (with its own pick-rate graph) ──
function renderPerkDetail(perkId) {
  const p = _nlData?.perks?.[perkId];
  if (!p) return '<div class="empty-state">Perk not found.</div>';
  const img = perkImage(perkId, 85);
  const history = _statsCache?.top_survivor_perks?.find(x => x.perk_id == perkId)?.history
    || _statsCache?.top_killer_perks?.find(x => x.perk_id == perkId)?.history
    || [];
  const pct = _statsCache?.top_survivor_perks?.find(x => x.perk_id == perkId)?.pct
    || _statsCache?.top_killer_perks?.find(x => x.perk_id == perkId)?.pct;
  return `
    <div class="perk-detail">
      <button class="btn btn-sm perk-detail-back">${icon('arrowUp')} Back</button>
      <div class="perk-detail-head">
        ${img ? `<img class="perk-detail-img" src="${img}" alt="${p.name}" />` : ''}
        <div class="perk-detail-title">
          <div class="perk-detail-name">${p.name}</div>
          <div class="perk-detail-role">${pct !== undefined ? `${pct}% usage` : ''}</div>
        </div>
      </div>
      <div class="perk-detail-desc">
        <h4>Description</h4>
        <div class="perk-detail-desc-html">${p.desc_html || 'No description available.'}</div>
      </div>
      <div class="perk-detail-graph">
        <h4>Pick Rate Over Time</h4>
        ${renderPickGraph(history)}
      </div>
    </div>`;
}

// ── Bind perk detail interactions ──
function bindPerkDetail(content, data) {
  const back = content.querySelector('.perk-detail-back');
  if (back) back.addEventListener('click', () => renderTab('characters', data));
  const wrap = content.querySelector('.pick-graph-wrap');
  if (wrap) bindPickHover(wrap);
}

// ── Graph hover tooltip: show value at the nearest point ──
function bindPickHover(wrap) {
  const tip = wrap.querySelector('.pick-tooltip');
  const svg = wrap.querySelector('.pick-graph');
  const dots = wrap.querySelectorAll('.pick-dot');
  dots.forEach(dot => {
    dot.addEventListener('mouseenter', () => {
      const val = dot.dataset.val;
      const date = dot.dataset.date;
      tip.textContent = `${date}: ${val}%`;
      tip.classList.remove('hidden');
      // position near the dot (convert SVG coords to page coords)
      const rect = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      const x = rect.left + (parseFloat(dot.getAttribute('cx')) / vb.width) * rect.width;
      const y = rect.top + (parseFloat(dot.getAttribute('cy')) / vb.height) * rect.height;
      tip.style.left = (x - tip.offsetWidth / 2) + 'px';
      tip.style.top = (y - tip.offsetHeight - 8) + 'px';
    });
    dot.addEventListener('mouseleave', () => tip.classList.add('hidden'));
  });
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

  // Tab switching
  document.querySelectorAll('.stats-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _currentTab = btn.dataset.tab;
      document.querySelectorAll('.stats-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (_statsCache) renderTab(_currentTab, _statsCache);
    });
  });

  document.querySelector('.nav-item[data-page="stats"]').addEventListener('click', () => {
    setTimeout(() => loadStats(), 50);
  });
});
