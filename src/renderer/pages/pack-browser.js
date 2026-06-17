// ── Pack Browser Page ──

let currentPageNum = 1;
let currentSort = 'downloads';
let currentSearch = '';
let currentVersion = '';
const PER_PAGE = 12;

let gameVersions = [];

async function loadGameVersions() {
  try {
    const data = await window.nightlight.fetchGameVersions();
    gameVersions = data['game-versions'] || [];
    const select = $('#filter-version');
    select.innerHTML = '<option value="">All versions</option>' +
      gameVersions.map(v => `<option value="${v.number}">${v.number} — ${v.title}</option>`).join('');
  } catch (e) {
    console.warn('Failed to load game versions:', e);
  }
}

async function loadPackBrowser() {
  const grid = $('#pack-grid');
  const pagination = $('#pack-pagination');

  try {
    grid.innerHTML = '<div class="loading">Loading packs...</div>';

    const result = await window.nightlight.fetchPacks({
      page: currentPageNum,
      perPage: PER_PAGE,
      sortBy: currentSort,
      search: currentSearch,
      version: currentVersion
    });

    const packs = result.data?.packs || [];
    const total = result.data?.total_packs || 0;
    const totalPages = Math.ceil(total / PER_PAGE);

    if (packs.length === 0) {
      grid.innerHTML = '<div class="empty-state">No packs found.</div>';
      pagination.classList.add('hidden');
      return;
    }

    const installed = await window.nightlight.getInstalledPacks();
    const installedMap = {};
    installed.forEach(p => { installedMap[p.id] = p.categories || []; });

    grid.innerHTML = packs.map(pack => {
      const categories = pack.has || [];
      const installedCats = installedMap[pack.id] || [];
      const versionName = gameVersions.find(v => v.number === pack.dbd_version);
      const safeTitle = pack.title.replace(/'/g, "\\'");
      const catsStr = categories.join(',');

      return `
      <div class="pack-tile">
        <div class="pack-banner-wrap" data-banner="${pack.id}" data-version="${pack.current_version}">
          <div class="pack-banner-skeleton"></div>
          <img class="pack-banner" data-src="${pack.id}" data-version="${pack.current_version}"
               alt="${pack.title}"
               onerror="this.parentElement.classList.add('banner-missing')">
        </div>
        <div class="pack-info">
          <div class="pack-title">${pack.title}</div>
          <div class="pack-creator">by ${pack.creators?.[0]?.username || 'Unknown'}</div>
          <div class="pack-meta">
            <span>${(pack.downloads || 0).toLocaleString()} dl</span>
            <span class="pack-version-badge" title="Game version: ${pack.dbd_version}${versionName ? ' — ' + versionName.title : ''}">DBD ${pack.dbd_version}</span>
          </div>
          <div class="pack-categories">
            ${categories.map(cat => `
              <span class="cat-chip ${installedCats.includes(cat) ? 'cat-installed' : ''}">
                ${categoryIcon(cat)} ${categoryLabel(cat)}
              </span>
            `).join('')}
          </div>
          <div class="pack-actions">
            <button class="btn btn-sm btn-primary install-btn"
                    data-url="${pack.url}"
                    data-title="${safeTitle}"
                    data-categories="${catsStr}">
              ${icon('download')} Install
            </button>
            <button class="btn-icon preview-tile-btn"
                    data-id="${pack.id}"
                    data-version="${pack.current_version}"
                    data-title="${safeTitle}"
                    data-url="${pack.url}"
                    title="Preview icons">
              ${icon('eye')}
            </button>
          </div>
        </div>
      </div>`;
    }).join('');

    // Attach install click handlers
    document.querySelectorAll('.install-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openInstallModal(
          btn.dataset.url,
          btn.dataset.title,
          btn.dataset.categories
        );
      });
    });

    // Attach preview click handlers
    document.querySelectorAll('.preview-tile-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openPreview(
          btn.dataset.id,
          btn.dataset.version,
          btn.dataset.title,
          btn.dataset.url
        );
      });
    });

    loadBanners();

    if (totalPages > 1) {
      pagination.classList.remove('hidden');
      $('#page-info').textContent = `Page ${currentPageNum} of ${totalPages}`;
      $('#page-prev').disabled = currentPageNum <= 1;
      $('#page-next').disabled = currentPageNum >= totalPages;
    } else {
      pagination.classList.add('hidden');
    }

  } catch (err) {
    grid.innerHTML = `<div class="empty-state">${icon('alertCircle')} Error loading packs: ${err.message}</div>`;
    pagination.classList.add('hidden');
  }
}

// ── Install Modal (with progress) ──

function openInstallModal(packUrl, title, categoriesStr) {
  closeModal('.install-modal');

  const categories = categoriesStr ? categoriesStr.split(',').filter(Boolean) : [];

  const modal = document.createElement('div');
  modal.className = 'install-modal';
  modal.innerHTML = `
    <div class="install-backdrop"></div>
    <div class="install-panel">
      <div class="install-header">
        <h3>${icon('download')} Install — ${title}</h3>
        <button class="btn-icon close-modal-btn">${icon('close')}</button>
      </div>
      <div class="install-body">
        <p class="install-desc">Select which icon categories to install:</p>
        <div class="install-categories">
          ${categories.length === 0 ? '<p class="empty-state">No categories available for this pack.</p>' : ''}
          ${categories.map(cat => `
            <label class="install-check">
              <input type="checkbox" value="${cat}" checked />
              <span class="check-box"></span>
              ${categoryIcon(cat)} ${categoryLabel(cat)}
            </label>
          `).join('')}
        </div>
        <div id="install-progress-area" class="install-progress hidden">
          <div class="progress-bar-track">
            <div class="progress-bar-fill" id="progress-fill"></div>
          </div>
          <div class="progress-label" id="progress-label">Starting...</div>
        </div>
      </div>
      <div class="install-footer">
        <button class="btn close-modal-btn" id="install-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="install-confirm-btn">${icon('download')} Install Selected</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('visible'));

  const closeAll = () => modal.remove();
  modal.querySelectorAll('.close-modal-btn').forEach(el => {
    el.addEventListener('click', closeAll);
  });
  modal.querySelector('.install-backdrop').addEventListener('click', closeAll);

  let progressActive = false;

  document.getElementById('install-confirm-btn').addEventListener('click', async () => {
    if (progressActive) return; // prevent double-click

    const checks = modal.querySelectorAll('.install-check input:checked');
    const cats = Array.from(checks).map(c => c.value);
    if (cats.length === 0) {
      showNotification('Select at least one category', 'error');
      return;
    }

    // Switch to progress mode
    progressActive = true;
    document.getElementById('install-confirm-btn').disabled = true;
    document.getElementById('install-confirm-btn').innerHTML = `${icon('refresh')} Installing...`;
    document.getElementById('install-cancel-btn').style.display = 'none';
    document.getElementById('install-progress-area').classList.remove('hidden');

    // Clear checkboxes
    modal.querySelectorAll('.install-check').forEach(el => el.style.display = 'none');
    document.querySelector('.install-desc').textContent = 'Downloading and installing...';

    // Listen to progress events
    const cleanup = window.nightlight.onInstallProgress((prog) => {
      const fill = document.getElementById('progress-fill');
      const label = document.getElementById('progress-label');
      if (fill) fill.style.width = `${prog.percent}%`;
      if (label) label.textContent = prog.label;
    });

    try {
      const result = await window.nightlight.installPack(packUrl, title, cats);
      document.getElementById('progress-label').textContent = `Done! ${result.copied} icons installed.`;
      document.getElementById('progress-fill').style.width = '100%';
      setTimeout(() => {
        modal.remove();
        loadPackBrowser();
      }, 1500);
    } catch (err) {
      document.getElementById('progress-label').textContent = `Failed: ${err.message}`;
      document.getElementById('progress-fill').style.background = 'var(--danger)';
      showNotification(`Install failed: ${err.message}`, 'error');
    } finally {
      cleanup();
    }
  });
}

function closeModal(selector) {
  document.querySelector(selector)?.remove();
}

// ── Preview tab renderer ──

function renderPreviewTab(category, previews, container) {
  const items = previews[category];
  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="preview-placeholder">
        ${categoryIcon(category)}
        <p>${categoryLabel(category)} icons</p>
        <p class="preview-hint">No preview icons available for this category</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="preview-section-header">${categoryIcon(category)} ${categoryLabel(category)} (${items.length})</div>
    <div class="preview-icon-grid">
      ${items.map(i => {
        const dataUrl = i.data || i;
        const label = (i.name || '').replace(/^iconPerks_|^T_UI_iconPerks_|^iconPerk_|^iconAddon_|^iconItem_|^iconFavors_|^iconStatusEffect_|^iconPower_|^iconAction_|^T_UI_/i, '').slice(0, 20);
        return `
          <div class="preview-icon-wrap" title="${i.name || ''}">
            <img class="preview-icon" src="${dataUrl}" loading="lazy" />
            <span class="preview-icon-label">${label}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ── Preview Modal ──

async function openPreview(packId, version, title, packUrl) {
  closeModal('.preview-modal');

  const modal = document.createElement('div');
  modal.className = 'preview-modal';
  modal.innerHTML = `
    <div class="preview-backdrop"></div>
    <div class="preview-panel">
      <div class="preview-header">
        <div class="preview-header-left">
          <h3>${title}</h3>
          <div id="preview-progress" class="preview-progress hidden">
            <div class="progress-bar-track preview-progress-track">
              <div class="progress-bar-fill" id="preview-progress-fill"></div>
            </div>
            <span class="progress-label" id="preview-progress-label">Downloading...</span>
          </div>
        </div>
        <div class="preview-header-actions">
          <button class="btn btn-sm btn-primary preview-install-btn"
                  data-url="${packUrl}" data-title="${title.replace(/'/g, "\\'")}"
                  style="display:none">
            ${icon('download')} Install from preview
          </button>
          <button class="btn-icon close-modal-btn">${icon('close')}</button>
        </div>
      </div>
      <div class="preview-tabs" id="preview-tabs">
        <div class="loading">Downloading pack to preview icons...</div>
      </div>
      <div class="preview-grid" id="preview-grid">
        <div class="loading">Fetching pack data...</div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('visible'));

  modal.querySelectorAll('.close-modal-btn').forEach(el => {
    el.addEventListener('click', () => modal.remove());
  });
  modal.querySelector('.preview-backdrop').addEventListener('click', () => modal.remove());

  try {
    const result = await window.nightlight.fetchPacks({ search: '', page: 1, perPage: 24 });
    const allPacks = result.data?.packs || [];
    const pack = allPacks.find(p => p.id === packId);

    if (!pack) {
      document.getElementById('preview-grid').innerHTML = '<div class="empty-state">Pack data not available</div>';
      return;
    }

    const categories = pack.has || [];
    const tabsContainer = document.getElementById('preview-tabs');
    const gridContainer = document.getElementById('preview-grid');

    if (categories.length === 0) {
      tabsContainer.innerHTML = '<div class="empty-state">No icon categories in this pack</div>';
      return;
    }

    tabsContainer.innerHTML = categories.map((cat, idx) => `
      <button class="preview-tab ${idx === 0 ? 'active' : ''}" data-cat="${cat}">
        ${categoryIcon(cat)} ${categoryLabel(cat)}
      </button>
    `).join('');

    // Show download progress in the header
    const progressArea = document.getElementById('preview-progress');
    const progressFill = document.getElementById('preview-progress-fill');
    const progressLabel = document.getElementById('preview-progress-label');
    progressArea.classList.remove('hidden');

    // Poll progress while downloading
    const progressInterval = setInterval(async () => {
      const prog = await window.nightlight.getPreviewProgress();
      if (prog) {
        progressFill.style.width = `${prog.percent}%`;
        progressLabel.textContent = prog.label;
        if (prog.percent >= 100) clearInterval(progressInterval);
      }
    }, 200);

    gridContainer.innerHTML = '<div class="loading">Downloading pack to preview icons...</div>';
    const previewData = await window.nightlight.fetchPackPreview(packUrl, packId, version);
    clearInterval(progressInterval);

    const previews = previewData.icons || {};

    // Mark as done
    progressFill.style.width = '100%';
    progressLabel.textContent = `Ready — ${previewData.total} icons`;
    setTimeout(() => progressArea.classList.add('hidden'), 2000);

    tabsContainer.querySelectorAll('.preview-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        tabsContainer.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderPreviewTab(tab.dataset.cat, previews, gridContainer);
      });
    });

    renderPreviewTab(categories[0], previews, gridContainer);

    // Show the install button now that preview is cached
    const installBtn = modal.querySelector('.preview-install-btn');
    installBtn.style.display = 'inline-flex';
    installBtn.addEventListener('click', () => {
      openInstallFromPreview(packUrl, title, categories.join(','));
    });

  } catch (err) {
    document.getElementById('preview-grid').innerHTML = `<div class="empty-state">${icon('alertCircle')} ${err.message}</div>`;
  }
}

// ── Install from preview cache ──

function openInstallFromPreview(packUrl, title, categoriesStr) {
  closeModal('.install-modal');

  const categories = categoriesStr ? categoriesStr.split(',').filter(Boolean) : [];

  const modal = document.createElement('div');
  modal.className = 'install-modal';
  modal.innerHTML = `
    <div class="install-backdrop"></div>
    <div class="install-panel">
      <div class="install-header">
        <h3>${icon('download')} Install — ${title}</h3>
        <button class="btn-icon close-modal-btn">${icon('close')}</button>
      </div>
      <div class="install-body">
        <p class="install-desc">Select which icon categories to install (pack already downloaded for preview):</p>
        <div class="install-categories">
          ${categories.length === 0 ? '<p class="empty-state">No categories available.</p>' : ''}
          ${categories.map(cat => `
            <label class="install-check">
              <input type="checkbox" value="${cat}" checked />
              <span class="check-box"></span>
              ${categoryIcon(cat)} ${categoryLabel(cat)}
            </label>
          `).join('')}
        </div>
      </div>
      <div class="install-footer">
        <button class="btn close-modal-btn">Cancel</button>
        <button class="btn btn-primary confirm-install-preview-btn">${icon('download')} Install Selected</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('visible'));

  modal.querySelectorAll('.close-modal-btn').forEach(el => {
    el.addEventListener('click', () => modal.remove());
  });
  modal.querySelector('.install-backdrop').addEventListener('click', () => modal.remove());

  modal.querySelector('.confirm-install-preview-btn').addEventListener('click', async () => {
    const checks = modal.querySelectorAll('.install-check input:checked');
    const cats = Array.from(checks).map(c => c.value);
    if (cats.length === 0) {
      showNotification('Select at least one category', 'error');
      return;
    }
    try {
      const result = await window.nightlight.installFromPreview(packUrl, title, cats);
      showNotification(`Installed ${result.copied} icons from ${result.categories.length} categories!`, 'success');
      modal.remove();
      closeModal('.preview-modal');
      loadPackBrowser();
    } catch (err) {
      showNotification(`Install failed: ${err.message}`, 'error');
    }
  });
}

// ── Banner loading via IPC proxy ──

async function loadBanners() {
  const wraps = document.querySelectorAll('.pack-banner-wrap[data-banner]');
  for (const wrap of wraps) {
    const packId = wrap.dataset.banner;
    const version = wrap.dataset.version;
    const img = wrap.querySelector('.pack-banner');
    if (!img) continue;

    try {
      const dataUrl = await window.nightlight.fetchBanner(packId, version);
      img.src = dataUrl;
      img.onerror = null;
      wrap.querySelector('.pack-banner-skeleton')?.remove();
    } catch {
      wrap.classList.add('banner-missing');
      wrap.querySelector('.pack-banner-skeleton')?.remove();
    }
  }
}

// ── Force refresh installed list ──

async function refreshInstalledPacks() {
  try {
    await window.nightlight.getInstalledPacks(); // just warm cache
    // If the installed page exists and has a load function, call it
    if (typeof loadInstalledPacks === 'function') loadInstalledPacks();
  } catch {}
}

// ── Helper ──
let _packCache = null;
async function getPackData(packId) {
  if (!_packCache) {
    const result = await window.nightlight.fetchPacks({ page: 1, perPage: 24, sortBy: 'downloads' });
    _packCache = result.data?.packs || [];
  }
  return _packCache.find(p => p.id === packId);
}

// ── Event listeners ──
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = $('#pack-search');
  const sortSelect = $('#pack-sort');
  const versionSelect = $('#filter-version');
  const prevBtn = $('#page-prev');
  const nextBtn = $('#page-next');
  const viewAllBtn = $('#view-all-packs');

  loadGameVersions();

  viewAllBtn?.addEventListener('click', () => {
    currentSearch = '';
    currentVersion = '';
    currentSort = 'downloads';
    currentPageNum = 1;
    searchInput.value = '';
    sortSelect.value = 'downloads';
    versionSelect.value = '';
    _packCache = null;
    loadPackBrowser();
  });

  if (viewAllBtn) viewAllBtn.innerHTML = `${icon('refresh')} All Packs`;

  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearch = searchInput.value;
      currentPageNum = 1;
      _packCache = null;
      loadPackBrowser();
    }, 300);
  });

  sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    currentPageNum = 1;
    _packCache = null;
    loadPackBrowser();
  });

  versionSelect.addEventListener('change', () => {
    currentVersion = versionSelect.value;
    currentPageNum = 1;
    _packCache = null;
    loadPackBrowser();
  });

  prevBtn.addEventListener('click', () => {
    if (currentPageNum > 1) { currentPageNum--; loadPackBrowser(); }
  });

  nextBtn.addEventListener('click', () => {
    currentPageNum++; loadPackBrowser();
  });
});
