const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const api = require('./api');
const settings = require('./settings');
const https = require('https');
const { URL } = require('url');
const { execSync } = require('child_process');
const os = require('os');

const INSTALLED_PACKS_FILE = 'installed-packs.json';
const PACKFILES_DIR = 'packfiles';
const folderMap = { 'perks':'perks','powers':'powers','items':'items','itemaddons':'addons','addons':'addons','offerings':'offerings','favors':'offerings','statuseffects':'status','status':'status','actions':'actions','portraits':'portraits' };
const reverseMap = { perks:'Perks', powers:'Powers', items:'Items', addons:'ItemAddons', offerings:'Favors', status:'StatusEffects', actions:'Actions', portraits:'Portraits' };

function getDataDir() { return app.getPath('userData'); }
function getInstalledPacksPath() { return path.join(getDataDir(), INSTALLED_PACKS_FILE); }
function getPackfilesDir() { return path.join(getDataDir(), PACKFILES_DIR); }
function getPackDir(packUrl) { return path.join(getPackfilesDir(), packUrl); }

function loadInstalledPacks() {
  const filePath = getInstalledPacksPath();
  try { if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch (e) { console.error('Failed to load installed packs:', e.message); }
  return [];
}

function saveInstalledPacks(packs) { fs.writeFileSync(getInstalledPacksPath(), JSON.stringify(packs, null, 2), 'utf-8'); }

function getDbdIconsPath() {
  const dbdPath = settings.get('dbdPath');
  if (!dbdPath) return null;
  const iconsPath = path.join(dbdPath, 'DeadByDaylight', 'Content', 'UI', 'Icons');
  if (fs.existsSync(iconsPath)) return iconsPath;
  const directPath = path.join(dbdPath, 'Content', 'UI', 'Icons');
  if (fs.existsSync(directPath)) return directPath;
  return null;
}

// ── Full install with progress ──

async function installPackWithProgress(packUrl, title, categories, sendProgress) {
  const iconsPath = getDbdIconsPath();
  if (!iconsPath) throw new Error('DBD icons path not found. Configure your DBD path first.');

  const packDir = getPackDir(packUrl);

  // Step 1: Download if not cached
  if (!fs.existsSync(path.join(packDir, '.extracted'))) {
    sendProgress({ phase: 'download', percent: 0, label: 'Downloading pack...' });

    const buffer = await downloadPackZip(packUrl, (pct) => {
      sendProgress({ phase: 'download', percent: pct, label: `Downloading... ${Math.round(pct)}%` });
    });

    sendProgress({ phase: 'extract', percent: 0, label: 'Extracting icons...' });

    // Step 2: Extract to packfiles dir
    if (!fs.existsSync(packDir)) fs.mkdirSync(packDir, { recursive: true });
    const tmpZip = path.join(packDir, 'pack.zip');
    fs.writeFileSync(tmpZip, buffer);

    execSync(`unzip -o "${tmpZip}" -d "${packDir}/icons" 2>/dev/null`, { timeout: 30000 });
    fs.unlinkSync(tmpZip);
    fs.writeFileSync(path.join(packDir, '.extracted'), '');

    sendProgress({ phase: 'extract', percent: 100, label: 'Extraction complete' });
  } else {
    sendProgress({ phase: 'download', percent: 100, label: 'Pack already cached' });
    sendProgress({ phase: 'extract', percent: 100, label: 'Already extracted' });
  }

  // Step 3: Copy selected categories to DBD
  const extractDir = path.join(packDir, 'icons');
  sendProgress({ phase: 'copy', percent: 0, label: 'Copying icons to DBD...' });

  let totalFiles = 0;
  let copiedFiles = 0;

  // Count total files to copy first
  for (const cat of categories) {
    const srcName = reverseMap[cat];
    if (!srcName) continue;
    const srcDir = path.join(extractDir, srcName);
    const srcDirLower = path.join(extractDir, srcName.toLowerCase());
    const actualSrc = fs.existsSync(srcDir) ? srcDir : (fs.existsSync(srcDirLower) ? srcDirLower : null);
    if (!actualSrc) continue;
    totalFiles += countFiles(actualSrc);
  }

  if (totalFiles === 0) throw new Error('No icon files found for the selected categories.');

  let copied = 0;
  for (const cat of categories) {
    const srcName = reverseMap[cat];
    if (!srcName) continue;
    const srcDir = path.join(extractDir, srcName);
    const srcDirLower = path.join(extractDir, srcName.toLowerCase());
    const actualSrc = fs.existsSync(srcDir) ? srcDir : (fs.existsSync(srcDirLower) ? srcDirLower : null);
    if (!actualSrc) continue;

    const destDir = path.join(iconsPath, srcName);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    copyFiles(actualSrc, destDir, (increment) => {
      copied += increment;
      const pct = totalFiles > 0 ? Math.round((copied / totalFiles) * 100) : 0;
      sendProgress({ phase: 'copy', percent: pct, label: `Copying icons... ${copied}/${totalFiles}` });
    });
  }

  sendProgress({ phase: 'done', percent: 100, label: `Installed ${copied} icons from ${categories.length} categories` });

  // Step 4: Register in installed packs
  const packs = loadInstalledPacks();
  const existing = packs.find(p => p.id === packUrl);
  if (existing) {
    const merged = [...new Set([...(existing.categories || []), ...categories])];
    existing.categories = merged;
    existing.installedAt = Date.now();
    if (title) existing.title = title.replace(/\\'/g, "'");
  } else {
    packs.push({ id: packUrl, title: (title || '').replace(/\\'/g, "'"), version: '', categories, installedAt: Date.now(), order: packs.length });
  }
  saveInstalledPacks(packs);

  return { copied, categories };
}

function downloadPackZip(packUrl, onProgress) {
  return new Promise((resolve, reject) => {
    const url = `https://nightlight.gg/packs/${packUrl}/download`;
    doDownload(url, 0, resolve, reject, onProgress);
  });
}

function doDownload(url, redirectCount, resolve, reject, onProgress) {
  if (redirectCount > 5) { reject(new Error('Too many redirects')); return; }
  const lib = url.startsWith('https') ? https : http;
  const req = lib.request(url, {
    headers: { 'User-Agent': 'NightLight-Enhanced/0.1.0', 'Origin': 'https://nightlight.gg', 'Referer': 'https://nightlight.gg/' }
  }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      const redirectUrl = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
      doDownload(redirectUrl, redirectCount + 1, resolve, reject, onProgress);
      return;
    }
    const chunks = [];
    const total = parseInt(res.headers['content-length'] || '0', 10);
    let received = 0;
    res.on('data', (chunk) => {
      chunks.push(chunk);
      received += chunk.length;
      if (total > 0) onProgress((received / total) * 100);
    });
    res.on('end', () => resolve(Buffer.concat(chunks)));
  });
  req.on('error', reject);
  req.end();
}

function countFiles(dir) {
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) count += countFiles(fullPath);
      else if (entry.isFile()) count++;
    }
  } catch {}
  return count;
}

function copyFiles(src, dest, onCopy) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const sPath = path.join(src, entry.name);
    const dPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (!fs.existsSync(dPath)) fs.mkdirSync(dPath, { recursive: true });
      copyFiles(sPath, dPath, onCopy);
    } else if (entry.isFile()) {
      fs.copyFileSync(sPath, dPath);
      onCopy(1);
    }
  }
}

function updatePackCategories(packId, categories) {
  const packs = loadInstalledPacks();
  const pack = packs.find(p => p.id === packId);
  if (!pack) throw new Error('Pack not found in installed list');
  pack.categories = categories;
  pack.installedAt = Date.now();
  saveInstalledPacks(packs);
  return packs;
}

function removePack(packId) {
  let packs = loadInstalledPacks();
  packs = packs.filter(p => p.id !== packId);
  saveInstalledPacks(packs);
  return packs;
}

function setPackOrder(order) {
  const packs = loadInstalledPacks();
  const ordered = order.map((id, idx) => {
    const pack = packs.find(p => p.id === id);
    if (pack) { pack.order = idx; return pack; }
    return null;
  }).filter(Boolean);
  saveInstalledPacks(ordered);
  return ordered;
}

function revertToDefault() {
  const iconsPath = getDbdIconsPath();
  if (!iconsPath) throw new Error('DBD path not configured');
  saveInstalledPacks([]);
  return true;
}

module.exports = {
  loadInstalledPacks, saveInstalledPacks, getDbdIconsPath,
  updatePackCategories, removePack, setPackOrder, revertToDefault, getCacheDir: () => path.join(getDataDir(), 'cached_images'),
  installPackWithProgress
};
