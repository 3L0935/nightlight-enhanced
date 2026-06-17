// ── Pack Manager Page ──

async function loadInstalledPacks() {
  const list = $('#installed-list');

  try {
    const packs = await window.nightlight.getInstalledPacks();

    if (!packs || packs.length === 0) {
      list.innerHTML = '<div class="empty-state">No packs installed yet. Browse the Packs tab to find some!</div>';
      return;
    }

    list.innerHTML = packs.map((pack, idx) => {
      const cats = pack.categories || [];
      return `
      <div class="installed-item" data-id="${pack.id}">
        <div class="installed-info">
          <div class="installed-name-row">
            <span class="pack-name">${(pack.title || pack.id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).replace(/\\'/g, "'")}</span>
            <span class="pack-version">${pack.version ? 'v' + pack.version : ''}</span>
            ${idx === 0 ? '<span class="badge badge-active">Active</span>' : ''}
          </div>
          <div class="installed-categories">
            ${['perks','powers','items','addons','offerings','status','actions','portraits'].filter(c => cats.includes(c)).map(cat => `
              <span class="cat-chip cat-installed" onclick="removeCategory('${pack.id}','${cat}')" title="Click to remove ${categoryLabel(cat)}">
                ${categoryIcon(cat)} ${categoryLabel(cat)} ${icon('x')}
              </span>
            `).join('')}
          </div>
          <div class="installed-date">Installed ${pack.installedAt ? new Date(pack.installedAt).toLocaleDateString() : 'unknown'}</div>
        </div>
        <div class="installed-actions">
          <button class="btn-icon" onclick="movePackUp('${pack.id}')" ${idx === 0 ? 'disabled' : ''} title="Move up">${icon('arrowUp')}</button>
          <button class="btn-icon" onclick="movePackDown('${pack.id}')" ${idx === packs.length - 1 ? 'disabled' : ''} title="Move down">${icon('arrowDown')}</button>
          <button class="btn-icon btn-icon-danger" onclick="removePack('${pack.id}')" title="Remove pack">${icon('trash')}</button>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    list.innerHTML = `<div class="empty-state">${icon('alertCircle')} Error: ${err.message}</div>`;
  }
}

async function removeCategory(packId, category) {
  try {
    const packs = await window.nightlight.getInstalledPacks();
    const pack = packs.find(p => p.id === packId);
    if (!pack) return;

    const updated = (pack.categories || []).filter(c => c !== category);
    if (updated.length === 0) {
      await window.nightlight.removePack(packId);
    } else {
      await window.nightlight.updatePackCategories(packId, updated);
    }
    showNotification(`Removed: ${categoryLabel(category)} from ${pack.title || pack.id}`, 'info');
    loadInstalledPacks();
  } catch (err) {
    showNotification(`Error: ${err.message}`, 'error');
  }
}

async function movePackUp(packId) {
  const packs = await window.nightlight.getInstalledPacks();
  const idx = packs.findIndex(p => p.id === packId);
  if (idx <= 0) return;
  [packs[idx - 1], packs[idx]] = [packs[idx], packs[idx - 1]];
  await window.nightlight.setPackOrder(packs.map(p => p.id));
  loadInstalledPacks();
}

async function movePackDown(packId) {
  const packs = await window.nightlight.getInstalledPacks();
  const idx = packs.findIndex(p => p.id === packId);
  if (idx < 0 || idx >= packs.length - 1) return;
  [packs[idx], packs[idx + 1]] = [packs[idx + 1], packs[idx]];
  await window.nightlight.setPackOrder(packs.map(p => p.id));
  loadInstalledPacks();
}

async function removePack(packId) {
  try {
    await window.nightlight.removePack(packId);
    showNotification('Pack removed', 'success');
    loadInstalledPacks();
  } catch (err) {
    showNotification(`Error: ${err.message}`, 'error');
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  $('#revert-default').addEventListener('click', async () => {
    if (!confirm('This will remove ALL custom icons and restore defaults. Continue?')) return;
    try {
      await window.nightlight.revertToDefault();
      showNotification('Reverted to default icons', 'success');
      loadInstalledPacks();
    } catch (err) {
      showNotification(`Error: ${err.message}`, 'error');
    }
  });

  document.querySelector('.nav-item[data-page="pack-manager"]').addEventListener('click', () => {
    setTimeout(loadInstalledPacks, 100);
  });
});
