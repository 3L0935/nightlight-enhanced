// ── Settings Page ──

async function loadSettings() {
  try {
    const all = await window.nightlight.getAllSettings();
    $('#setting-dbd-path').value = all.dbdPath || '';
    $('#setting-api-token').value = all.apiToken || '';
    $('#setting-capture-quality').value = all.captureQuality || 'high';
    $('#setting-keep-screenshots').value = all.keepScreenshots || 'delete-after-upload';
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

async function saveSettings() {
  try {
    await window.nightlight.setSetting('dbdPath', $('#setting-dbd-path').value);
    await window.nightlight.setSetting('apiToken', $('#setting-api-token').value);
    await window.nightlight.setSetting('captureQuality', $('#setting-capture-quality').value);
    await window.nightlight.setSetting('keepScreenshots', $('#setting-keep-screenshots').value);
    showNotification('Settings saved!', 'success');
  } catch (err) {
    showNotification(`Error saving settings: ${err.message}`, 'error');
  }
}

async function detectDbdPath() {
  const btn = $('#detect-dbd');
  const input = $('#setting-dbd-path');
  btn.disabled = true;
  btn.innerHTML = `${icon('refresh')} Scanning...`;

  try {
    const results = await window.nightlight.detectDbdPath();
    if (!results || results.length === 0) {
      showNotification('No DBD installation found. Set the path manually.', 'info');
      return;
    }

    if (results.length === 1) {
      input.value = results[0];
      showNotification(`DBD found at: ${results[0]}`, 'success');
    } else {
      showDbdPickerModal(results);
    }
  } catch (err) {
    showNotification(`Detection failed: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${icon('refresh')} Auto-detect`;
  }
}

function showDbdPickerModal(paths) {
  const existing = document.querySelector('.install-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'install-modal';
  modal.innerHTML = `
    <div class="install-backdrop"></div>
    <div class="install-panel">
      <div class="install-header">
        <h3>${icon('installed')} Multiple DBD installations found</h3>
        <button class="btn-icon close-modal-btn">${icon('close')}</button>
      </div>
      <div class="install-body">
        <p class="install-desc">Select which installation to use:</p>
        <div class="install-categories">
          ${paths.map((p, i) => `
            <label class="install-check">
              <input type="radio" name="dbd-select" value="${p}" ${i === 0 ? 'checked' : ''} />
              <span class="check-box"></span>
              <span style="font-size:12px;word-break:break-all;">${p}</span>
            </label>
          `).join('')}
        </div>
      </div>
      <div class="install-footer">
        <button class="btn close-modal-btn">Cancel</button>
        <button class="btn btn-primary confirm-dbd-btn">${icon('check')} Use Selected</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('visible'));

  modal.querySelectorAll('.close-modal-btn').forEach(el => {
    el.addEventListener('click', () => modal.remove());
  });
  modal.querySelector('.install-backdrop').addEventListener('click', () => modal.remove());
  modal.querySelector('.confirm-dbd-btn').addEventListener('click', () => {
    const selected = modal.querySelector('input[name="dbd-select"]:checked');
    if (selected) {
      $('#setting-dbd-path').value = selected.value;
      showNotification(`DBD path set to: ${selected.value}`, 'success');
    }
    modal.remove();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  $('#settings-save').innerHTML = `${icon('save')} Save Settings`;
  $('#settings-save').addEventListener('click', saveSettings);

  $('#detect-dbd').innerHTML = `${icon('refresh')} Auto-detect`;
  $('#detect-dbd').addEventListener('click', detectDbdPath);

  $('#api-token-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.open('https://nightlight.gg/account/api', '_blank');
  });

  document.querySelector('.nav-item[data-page="settings"]').addEventListener('click', () => {
    setTimeout(loadSettings, 100);
  });
});
