const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const API_BASE = 'https://api.nightlight.gg/v1';
const WEB_API_BASE = 'https://nightlight.gg/api/v1';
const CDN_BASE = 'https://cdn.nightlight.gg';

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request(url, {
      method: options.method || 'GET',
      headers: { 'User-Agent': 'NightLight-Enhanced/0.1.0', ...(options.headers || {}) }
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); } catch { resolve(body); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function fetchPacks({ page = 1, perPage = 12, sortBy = 'downloads', search = '', author = '', version = '', includes = '', includeMode = '' } = {}) {
  const params = new URLSearchParams();
  params.set('page', page); params.set('per_page', perPage); params.set('sort_by', sortBy);
  if (search) params.set('search', search);
  if (author) params.set('author', author);
  if (version) params.set('version', version);
  if (includes) params.set('includes', includes);
  if (includeMode) params.set('include_mode', includeMode);
  return request(`${WEB_API_BASE}/packs?${params.toString()}`);
}

async function fetchAuthors() { return request(`${WEB_API_BASE}/packs/authors`); }

async function uploadScreenshot(filePath, apiToken) {
  const boundary = '----NightLightEnhanced' + Date.now();
  const fileContent = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: image/${path.extname(filePath).slice(1)}\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([Buffer.from(header, 'utf-8'), fileContent, Buffer.from(footer, 'utf-8')]);
  return request(`${API_BASE}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length
    }, body
  });
}

function fetchBannerBase64(packId, version) {
  return new Promise((resolve, reject) => {
    const url = `${CDN_BASE}/packs/${packId}/${version}/banner.png`;
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, {
      headers: { 'User-Agent': 'NightLight-Enhanced/0.1.0', 'Origin': 'https://nightlight.gg', 'Referer': 'https://nightlight.gg/' }
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(`data:${res.headers['content-type'] || 'image/webp'};base64,${buffer.toString('base64')}`);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ── Persistent preview cache ──
// Stores extracted pack files under userData/cached_previews/{packUrl}/
// Survives app restarts. Hot cache (in-memory Map) for same-session speed.

const CACHE_DIR = 'cached_previews';
let hotCache = new Map();
let _lastProgress = null;

function getCacheDir() {
  const { app } = require('electron');
  return path.join(app.getPath('userData'), CACHE_DIR);
}

function getPackCacheDir(packUrl) {
  // Sanitize packUrl for filesystem safety
  const safe = packUrl.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(getCacheDir(), safe);
}

function loadCacheMeta(packUrl) {
  const cacheDir = getPackCacheDir(packUrl);
  const metaPath = path.join(cacheDir, 'cache.json');
  try {
    if (fs.existsSync(metaPath)) return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  } catch {}
  return null;
}

function saveCacheMeta(packUrl, meta) {
  const cacheDir = getPackCacheDir(packUrl);
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(path.join(cacheDir, 'cache.json'), JSON.stringify(meta, null, 2), 'utf-8');
}

function readIconDataUrl(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch { return null; }
}

function fetchPackPreview(packUrl) {
  // 1. Check hot cache first
  if (hotCache.has(packUrl)) {
    return Promise.resolve(hotCache.get(packUrl));
  }

  // 2. Check persistent disk cache
  const meta = loadCacheMeta(packUrl);
  if (meta && meta.extractDir && fs.existsSync(meta.extractDir)) {
    // Rebuild icons object from metadata — load data URLs for backward compat
    const icons = {};
    for (const [cat, files] of Object.entries(meta.icons || {})) {
      icons[cat] = files.map(f => {
        const filePath = path.join(meta.extractDir, f.relPath);
        return { ...f, filePath, data: readIconDataUrl(filePath) };
      });
    }
    const result = { icons, extractDir: meta.extractDir, total: meta.total, fromCache: true };
    hotCache.set(packUrl, result);
    return Promise.resolve(result);
  }

  // 3. Download fresh
  return new Promise((resolve, reject) => {
    doRequest(`https://nightlight.gg/packs/${packUrl}/download`, 0, (result) => {
      hotCache.set(packUrl, result);
      resolve(result);
    }, reject, (pct, label) => {
      _lastProgress = { percent: pct, label };
    });
  });
}

function getPreviewProgress() {
  return _lastProgress || null;
}

function getIconDataUrl(packUrl, cat, iconName) {
  // Load a single icon's data URL on demand (lazy)
  const cached = hotCache.get(packUrl);
  if (!cached) return null;
  const icons = cached.icons[cat];
  if (!icons) return null;
  const icon = icons.find(i => i.name === iconName);
  if (!icon) return null;
  if (icon.data) return icon.data;
  icon.data = readIconDataUrl(icon.filePath);
  return icon.data;
}

function doRequest(url, redirectCount, resolve, reject, onProgress) {
  if (redirectCount > 5) { reject(new Error('Too many redirects')); return; }
  const lib = url.startsWith('https') ? https : http;
  const req = lib.request(url, {
    headers: { 'User-Agent': 'NightLight-Enhanced/0.1.0', 'Origin': 'https://nightlight.gg', 'Referer': 'https://nightlight.gg/' }
  }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      const redirectUrl = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
      doRequest(redirectUrl, redirectCount + 1, resolve, reject, onProgress);
      return;
    }
    const chunks = [];
    const total = parseInt(res.headers['content-length'] || '0', 10);
    let received = 0;
    res.on('data', chunk => {
      chunks.push(chunk);
      received += chunk.length;
      if (total > 0 && onProgress) {
        const pct = Math.round((received / total) * 100);
        onProgress(pct, `Downloading... ${pct}%`);
      }
    });
    res.on('end', async () => {
      const buffer = Buffer.concat(chunks);
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      if (onProgress) onProgress(100, 'Extracting icons...');
      try {
        const result = await extractAndCache(buffer, url);
        if (onProgress) onProgress(100, `Ready — ${result.total} icons`);
        resolve(result);
      } catch (e) { reject(e); }
    });
  });
  req.on('error', reject);
  req.end();
}

const folderMap = { 'perks':'perks','powers':'powers','items':'items','itemaddons':'addons','addons':'addons','offerings':'offerings','favors':'offerings','statuseffects':'status','status':'status','actions':'actions','portraits':'portraits' };
const imageExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp']);

async function extractAndCache(zipBuffer, sourceUrl) {
  // Extract packUrl from the download URL
  const packUrl = sourceUrl ? sourceUrl.replace(/^https:\/\/nightlight\.gg\/packs\//, '').replace(/\/download$/, '') : 'unknown';
  const cacheDir = getPackCacheDir(packUrl);
  const extractDir = path.join(cacheDir, 'icons');

  // If already cached on disk, skip extraction
  if (fs.existsSync(path.join(cacheDir, 'cache.json')) && fs.existsSync(extractDir)) {
    const meta = loadCacheMeta(packUrl);
    if (meta) {
      const icons = {};
      for (const [cat, files] of Object.entries(meta.icons || {})) {
        icons[cat] = files.map(f => ({
          ...f,
          filePath: path.join(extractDir, f.relPath),
        }));
      }
      return { icons, extractDir, total: meta.total, fromCache: true };
    }
  }

  // Extract to persistent cache dir
  if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir, { recursive: true });
  const tmpZip = path.join(cacheDir, 'pack.zip');
  fs.writeFileSync(tmpZip, zipBuffer);
  execSync(`unzip -o "${tmpZip}" -d "${extractDir}" 2>/dev/null`, { timeout: 30000 });
  fs.unlinkSync(tmpZip);

  // Walk and collect metadata (no base64 — just file paths)
  const allFiles = [];
  function walkDir(dir, relativePath) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;
      if (entry.isDirectory()) {
        walkDir(fullPath, relPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!imageExts.has(ext)) continue;
        const topDir = relPath.split(/[/\\]/)[0];
        const cat = folderMap[topDir.toLowerCase()];
        if (!cat) continue;
        allFiles.push({ filePath: fullPath, relPath, name: path.basename(entry.name).replace(/\.\w+$/, ''), cat });
      }
    }
  }
  walkDir(extractDir, '');

  // Group + sort
  const icons = {};
  for (const f of allFiles) {
    if (!icons[f.cat]) icons[f.cat] = [];
    icons[f.cat].push(f);
  }
  for (const cat of Object.keys(icons)) icons[cat].sort((a, b) => a.name.localeCompare(b.name));

  // Save metadata (strip filePath — it's derivable from relPath + extractDir)
  const metaIcons = {};
  for (const [cat, files] of Object.entries(icons)) {
    metaIcons[cat] = files.map(f => ({ relPath: f.relPath, name: f.name, cat: f.cat }));
  }
  const meta = { extractDir, icons: metaIcons, total: allFiles.length, cachedAt: Date.now() };
  saveCacheMeta(packUrl, meta);

  return { icons, extractDir, total: allFiles.length, fromCache: false };
}

// ── Install from preview cache (no re-download) ──

function installFromPreview(packUrl, packTitle, categories, dbdIconsPath) {
  // Check hot cache first, then disk
  let cached = hotCache.get(packUrl);
  if (!cached) {
    const meta = loadCacheMeta(packUrl);
    if (!meta || !meta.extractDir || !fs.existsSync(meta.extractDir)) {
      throw new Error('Pack not previewed yet. Open the preview first.');
    }
    // Rebuild from disk
    const icons = {};
    for (const [cat, files] of Object.entries(meta.icons || {})) {
      icons[cat] = files.map(f => ({
        ...f,
        filePath: path.join(meta.extractDir, f.relPath),
      }));
    }
    cached = { icons, extractDir: meta.extractDir, total: meta.total };
    hotCache.set(packUrl, cached);
  }

  if (!cached.extractDir || !fs.existsSync(cached.extractDir)) {
    hotCache.delete(packUrl);
    throw new Error('Preview cache expired. Re-open the preview.');
  }

  const { extractDir } = cached;

  // Copy the top-level category folders that match the selected categories
  const reverseMap = {
    perks: 'Perks', powers: 'Powers', items: 'Items', addons: 'ItemAddons',
    offerings: 'Favors', status: 'StatusEffects', actions: 'Actions', portraits: 'Portraits'
  };

  let copiedCount = 0;
  for (const cat of categories) {
    const srcName = reverseMap[cat];
    if (!srcName) continue;
    const srcDir = path.join(extractDir, srcName);
    if (!fs.existsSync(srcDir)) continue;

    const srcDirLower = path.join(extractDir, srcName.toLowerCase());
    const actualSrc = fs.existsSync(srcDir) ? srcDir : (fs.existsSync(srcDirLower) ? srcDirLower : null);
    if (!actualSrc) continue;

    const destDir = path.join(dbdIconsPath, srcName);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    function copyRecursive(s, d) {
      const entries = fs.readdirSync(s, { withFileTypes: true });
      for (const entry of entries) {
        const sPath = path.join(s, entry.name);
        const dPath = path.join(d, entry.name);
        if (entry.isDirectory()) {
          if (!fs.existsSync(dPath)) fs.mkdirSync(dPath, { recursive: true });
          copyRecursive(sPath, dPath);
        } else if (entry.isFile()) {
          fs.copyFileSync(sPath, dPath);
          copiedCount++;
        }
      }
    }
    copyRecursive(actualSrc, destDir);
  }

  return { copied: copiedCount, categories };
}

module.exports = { fetchPacks, fetchAuthors, uploadScreenshot, fetchBannerBase64, fetchPackPreview, getPreviewProgress, getIconDataUrl, installFromPreview };
