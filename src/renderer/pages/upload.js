// ── Upload Page ──

async function checkUploadStatus() {
  const banner = $('#upload-status-banner');
  const area = $('#upload-area');
  const result = $('#upload-result');

  try {
    const all = await window.nightlight.getAllSettings();
    const token = all.apiToken || '';
    const dbdPath = all.dbdPath || '';

    if (!token) {
      banner.innerHTML = `
        ${icon('alertCircle')}
        <span>No API token configured. <a onclick="navigateTo('settings')">Go to Settings</a> to generate one at nightlight.gg/account/api.</span>
      `;
      banner.className = 'upload-status-banner warning';
      banner.classList.remove('hidden');
      area.style.opacity = '0.4';
      area.style.pointerEvents = 'none';
      return;
    }

    if (!dbdPath) {
      banner.innerHTML = `
        ${icon('alertCircle')}
        <span>DBD path not configured. <a onclick="navigateTo('settings')">Go to Settings</a> to set it.</span>
      `;
      banner.className = 'upload-status-banner warning';
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }

    area.style.opacity = '1';
    area.style.pointerEvents = 'auto';

  } catch (err) {
    console.error('Status check failed:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const uploadArea = $('#upload-area');
  const uploadInput = $('#upload-input');
  const uploadResult = $('#upload-result');

  // Create status banner
  const banner = document.createElement('div');
  banner.id = 'upload-status-banner';
  banner.className = 'upload-status-banner hidden';
  uploadArea.parentNode.insertBefore(banner, uploadArea);

  checkUploadStatus();

  uploadArea.addEventListener('click', () => uploadInput.click());

  uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await uploadFile(file);
    uploadInput.value = '';
  });

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });

  uploadArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) await uploadFile(file);
  });

  // Re-check when navigating to this page
  document.querySelector('.nav-item[data-page="upload"]').addEventListener('click', () => {
    setTimeout(checkUploadStatus, 100);
  });
});

async function uploadFile(file) {
  const result = $('#upload-result');
  result.classList.add('hidden');

  if (!file.type.startsWith('image/')) {
    showNotification('Please select an image file (JPG/PNG)', 'error');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showNotification('File too large (max 10MB)', 'error');
    return;
  }

  const filePath = file.path;
  if (!filePath) {
    showNotification('Could not determine file path. Try selecting via the file picker.', 'error');
    return;
  }

  showNotification('Uploading...', 'info', 0);

  try {
    const response = await window.nightlight.uploadScreenshot(filePath);
    const url = response.data?.url;

    if (url) {
      result.innerHTML = `
        <div class="upload-result-success">
          ${icon('check')}
          <div>
            <strong>Upload successful!</strong><br>
            <a href="${url}" target="_blank">${url}</a>
          </div>
        </div>
      `;
      result.classList.remove('hidden');
      showNotification('Upload complete!', 'success');
    } else {
      showNotification('Upload failed: no URL returned', 'error');
    }
  } catch (err) {
    result.innerHTML = `
      <div class="upload-result-error">
        ${icon('alertCircle')}
        <div>
          <strong>Upload failed</strong><br>
          ${err.message}
        </div>
      </div>
    `;
    result.classList.remove('hidden');
    showNotification(`Upload failed: ${err.message}`, 'error');
  }
}
