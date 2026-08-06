// ── Upload Page ──

let _selectedFile = null;

async function checkUploadStatus() {
  const banner = $('#upload-status-banner');
  const area = $('#upload-area');

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

function showPreview(file) {
  _selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    $('#upload-preview-img').src = e.target.result;
    $('#upload-area').classList.add('hidden');
    $('#upload-preview').classList.remove('hidden');
    $('#upload-result').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

function cancelPreview() {
  _selectedFile = null;
  $('#upload-preview').classList.add('hidden');
  $('#upload-area').classList.remove('hidden');
  $('#upload-input').value = '';
}

async function confirmUpload() {
  if (!_selectedFile) return;

  const progress = $('#upload-progress');
  const progressFill = $('#upload-progress-fill');
  const progressLabel = $('#upload-progress-label');
  const result = $('#upload-result');

  progress.classList.remove('hidden');
  result.classList.add('hidden');
  progressFill.style.width = '0%';
  progressLabel.textContent = 'Uploading...';

  // Simulate progress since we don't have real upload progress events
  let fakeProgress = 0;
  const progressInterval = setInterval(() => {
    fakeProgress = Math.min(fakeProgress + Math.random() * 15, 90);
    progressFill.style.width = fakeProgress + '%';
  }, 200);

  try {
    const filePath = _selectedFile.path;
    if (!filePath) {
      clearInterval(progressInterval);
      showNotification('Could not determine file path. Try selecting via the file picker.', 'error');
      progress.classList.add('hidden');
      return;
    }

    const response = await window.nightlight.uploadScreenshot(filePath);
    clearInterval(progressInterval);
    progressFill.style.width = '100%';
    progressLabel.textContent = 'Upload complete!';

    const url = response.data?.url;

    if (url && typeof url === 'string' && url.startsWith('https://')) {
      progress.classList.add('hidden');
      result.innerHTML = `
        <div class="upload-result-success">
          ${icon('check')}
          <div>
            <strong>Upload successful!</strong>
            <p class="upload-result-detail">Your match has been uploaded and is being analyzed.</p>
          </div>
        </div>
        <div class="upload-review-box">
          <h4>${icon('externalLink')} Next Step: Review Your Match</h4>
          <p>NightLight's OCR system automatically detects perks, items, offerings, and scores — but it's not perfect. You should review and correct any errors.</p>
          <a href="${url}" target="_blank" class="btn btn-primary upload-review-btn">
            ${icon('externalLink')} Open Match Review
          </a>
          <p class="upload-review-hint">Opens in your browser at nightlight.gg</p>
        </div>
      `;
      result.classList.remove('hidden');
      showNotification('Upload complete! Open the review page to verify stats.', 'success');

      // Reset for next upload
      _selectedFile = null;
      $('#upload-preview').classList.add('hidden');
      $('#upload-area').classList.remove('hidden');
    } else {
      result.innerHTML = `
        <div class="upload-result-error">
          ${icon('alertCircle')}
          <div>
            <strong>Upload failed</strong>
            <p>No URL returned from the API. The server may have rejected the image.</p>
          </div>
        </div>
      `;
      result.classList.remove('hidden');
      showNotification('Upload failed: no URL returned', 'error');
    }
  } catch (err) {
    clearInterval(progressInterval);
    progress.classList.add('hidden');
    result.innerHTML = `
      <div class="upload-result-error">
        ${icon('alertCircle')}
        <div>
          <strong>Upload failed</strong>
          <p>${err.message}</p>
        </div>
      </div>
    `;
    result.classList.remove('hidden');
    showNotification(`Upload failed: ${err.message}`, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const uploadArea = $('#upload-area');
  const uploadInput = $('#upload-input');

  $('#upload-icon-placeholder').innerHTML = icon('upload');

  checkUploadStatus();

  uploadArea.addEventListener('click', () => uploadInput.click());

  uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Please select an image file (JPG/PNG)', 'error');
      uploadInput.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification('File too large (max 5MB). NightLight rejects files over 5MB.', 'error');
      uploadInput.value = '';
      return;
    }

    showPreview(file);
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
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Please drop an image file (JPG/PNG)', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification('File too large (max 5MB). NightLight rejects files over 5MB.', 'error');
      return;
    }

    showPreview(file);
  });

  // Preview actions
  $('#upload-confirm-btn').innerHTML = `${icon('upload')} Upload to NightLight`;
  $('#upload-confirm-btn').addEventListener('click', confirmUpload);

  $('#upload-cancel-btn').innerHTML = `${icon('close')} Cancel`;
  $('#upload-cancel-btn').addEventListener('click', cancelPreview);

  // Re-check when navigating to this page
  document.querySelector('.nav-item[data-page="upload"]').addEventListener('click', () => {
    setTimeout(checkUploadStatus, 100);
  });
});
