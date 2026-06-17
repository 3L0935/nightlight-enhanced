// ── App Shell ──

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let currentPage = 'pack-browser';

// Inject SVG icons into nav
document.addEventListener('DOMContentLoaded', () => {
  $('#nav-icon-packs').innerHTML = icon('packs');
  $('#nav-icon-installed').innerHTML = icon('installed');
  $('#nav-icon-config').innerHTML = icon('config');
  $('#nav-icon-upload').innerHTML = icon('upload');
  $('#nav-icon-settings').innerHTML = icon('settings');
  $('#lock-icon').innerHTML = icon('lock');
  $('#upload-icon-placeholder').innerHTML = icon('image');
});

// Navigation
$$('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    navigateTo(page);
  });
});

function navigateTo(page) {
  currentPage = page;
  $$('.nav-item').forEach(b => b.classList.remove('active'));
  $(`.nav-item[data-page="${page}"]`).classList.add('active');
  $$('.page').forEach(p => p.classList.remove('active'));
  $(`#page-${page}`).classList.add('active');
}

// Notifications
function showNotification(text, type = 'info', duration = 4000) {
  const container = $('#notification-container');
  const el = document.createElement('div');
  el.className = `notification ${type}`;
  el.innerHTML = text;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(100%)';
    el.style.transition = 'all 0.3s';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// Lock indicator
async function updateLockIndicator() {
  try {
    const locked = await window.nightlight.getConfigLockStatus();
    const indicator = $('#lock-indicator');
    if (locked) {
      indicator.classList.remove('hidden');
    } else {
      indicator.classList.add('hidden');
    }
  } catch (e) {
    // DBD path not configured yet
  }
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof loadPackBrowser === 'function') loadPackBrowser();
  if (typeof loadSettings === 'function') loadSettings();
  updateLockIndicator();
  setInterval(updateLockIndicator, 5000);
});
