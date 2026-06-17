// ── Config Editor Page ──

let configDirty = false;
let prettyMode = true;

async function loadConfig() {
  const editor = $('#config-editor');
  const prettyContainer = $('#pretty-config');
  const pathDisplay = $('#config-path-display');
  const status = $('#config-status');

  try {
    const result = await window.nightlight.readConfig();
    editor.value = result.content;
    pathDisplay.innerHTML = `${icon('save')} ${result.path}`;
    status.textContent = '';
    status.className = 'config-status';
    configDirty = false;
    updateLockButton();

    if (prettyMode) {
      editor.style.display = 'none';
      prettyContainer.style.display = 'block';
      renderPrettyMode(result.content);
    } else {
      editor.style.display = 'block';
      prettyContainer.style.display = 'none';
    }
  } catch (err) {
    editor.value = '';
    pathDisplay.innerHTML = `${icon('alertCircle')} ${err.message}`;
    status.textContent = '';
    status.className = 'config-status';
  }
}

async function saveConfig() {
  const status = $('#config-status');

  try {
    let content;
    if (prettyMode) {
      content = serializePrettyConfig();
    } else {
      content = $('#config-editor').value;
    }

    await window.nightlight.writeConfig(content);
    status.innerHTML = `${icon('check')} Config saved successfully`;
    status.className = 'config-status success';
    configDirty = false;

    // Sync raw editor if in pretty mode
    if (prettyMode) {
      $('#config-editor').value = content;
    }

    showNotification('Config saved!', 'success');
  } catch (err) {
    status.innerHTML = `${icon('alertCircle')} ${err.message}`;
    status.className = 'config-status error';
    showNotification(`Save failed: ${err.message}`, 'error');
  }
}

async function toggleConfigLock() {
  try {
    const locked = await window.nightlight.getConfigLockStatus();
    if (locked) {
      await window.nightlight.unlockConfig();
      showNotification('Config unlocked', 'success');
    } else {
      await window.nightlight.lockConfig();
      showNotification('Config locked (read-only)', 'success');
    }
    updateLockButton();
    updateLockIndicator();
  } catch (err) {
    showNotification(`Error: ${err.message}`, 'error');
  }
}

async function updateLockButton() {
  const btn = $('#config-lock-toggle');
  try {
    const locked = await window.nightlight.getConfigLockStatus();
    btn.innerHTML = locked ? `${icon('unlock')} Unlock` : `${icon('lock')} Lock`;
  } catch {
    btn.innerHTML = `${icon('lock')} Lock`;
  }
}

function toggleEditorMode() {
  prettyMode = !prettyMode;
  const editor = $('#config-editor');
  const pretty = $('#pretty-config');
  const toggle = $('#mode-toggle');
  const label = $('#mode-label');

  toggle.checked = prettyMode;

  if (prettyMode) {
    editor.style.display = 'none';
    pretty.style.display = 'block';
    label.textContent = 'Pretty';
    renderPrettyMode(editor.value);
  } else {
    editor.style.display = 'block';
    pretty.style.display = 'none';
    label.textContent = 'Raw';
    if (typeof serializePrettyConfig === 'function') {
      editor.value = serializePrettyConfig();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const editor = $('#config-editor');
  const refreshBtn = $('#config-refresh');
  const saveBtn = $('#config-save');
  const lockBtn = $('#config-lock-toggle');
  const modeToggle = $('#mode-toggle');

  refreshBtn.innerHTML = `${icon('refresh')} Refresh`;
  saveBtn.innerHTML = `${icon('save')} Save`;

  refreshBtn.addEventListener('click', loadConfig);
  saveBtn.addEventListener('click', saveConfig);
  lockBtn.addEventListener('click', toggleConfigLock);
  modeToggle.addEventListener('change', toggleEditorMode);

  editor.addEventListener('input', () => { configDirty = true; });

  document.querySelector('.nav-item[data-page="config-editor"]').addEventListener('click', () => {
    prettyMode = true;
    setTimeout(loadConfig, 100);
  });

  window.addEventListener('beforeunload', (e) => {
    if (configDirty) { e.preventDefault(); e.returnValue = ''; }
  });
});
