const api = require('./api');
const packManager = require('./packManager');
const configManager = require('./configManager');
const settings = require('./settings');
const { app, BrowserWindow } = require('electron');

function registerIpcHandlers(ipcMain) {
  // ── Packs ──
  ipcMain.handle('packs:fetch', async (_, params) => {
    return api.fetchPacks(params || {});
  });

  ipcMain.handle('packs:banner', async (_, packId, version) => {
    return api.fetchBannerBase64(packId, version);
  });

  ipcMain.handle('packs:preview', async (_, packUrl, packId, version) => {
    return api.fetchPackPreview(packUrl, packId, version);
  });

  ipcMain.handle('packs:preview-progress', async () => {
    return api.getPreviewProgress();
  });

  // ── Install with progress (streamed via events) ──
  ipcMain.handle('packs:install', async (event, packUrl, title, categories) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) throw new Error('No window');

    function sendProgress(progress) {
      win.webContents.send('install-progress', progress);
    }

    return packManager.installPackWithProgress(packUrl, title, categories, sendProgress);
  });

  ipcMain.handle('packs:install-from-preview', async (_, packUrl, packTitle, categories) => {
    const dbdPath = settings.get('dbdPath');
    if (!dbdPath) throw new Error('DBD path not configured.');
    const iconsPath = packManager.getDbdIconsPath();
    if (!iconsPath) throw new Error('DBD icons path not found.');

    const result = await api.installFromPreview(packUrl, packTitle, categories, iconsPath);

    // Also register in installed packs
    const packs = packManager.loadInstalledPacks();
    const existing = packs.find(p => p.id === packUrl);
    if (existing) {
      const merged = [...new Set([...(existing.categories || []), ...categories])];
      existing.categories = merged;
      existing.installedAt = Date.now();
    } else {
      packs.push({ id: packUrl, title: packTitle, version: '', categories, installedAt: Date.now(), order: packs.length });
    }
    packManager.saveInstalledPacks(packs);

    return result;
  });

  ipcMain.handle('packs:authors', async () => {
    return api.fetchAuthors();
  });

  ipcMain.handle('packs:get-installed', async () => {
    return packManager.loadInstalledPacks();
  });

  ipcMain.handle('packs:update-categories', async (_, packId, categories) => {
    return packManager.updatePackCategories(packId, categories);
  });

  ipcMain.handle('packs:remove', async (_, packId) => {
    return packManager.removePack(packId);
  });

  ipcMain.handle('packs:set-order', async (_, order) => {
    return packManager.setPackOrder(order);
  });

  ipcMain.handle('packs:revert-default', async () => {
    return packManager.revertToDefault();
  });

  // ── Config ──
  ipcMain.handle('config:read', async () => {
    const dbdPath = settings.get('dbdPath');
    return configManager.readConfig(dbdPath);
  });

  ipcMain.handle('config:write', async (_, content) => {
    const dbdPath = settings.get('dbdPath');
    return configManager.writeConfig(dbdPath, content);
  });

  ipcMain.handle('config:path', async () => {
    const dbdPath = settings.get('dbdPath');
    return configManager.getConfigPath(dbdPath);
  });

  ipcMain.handle('config:lock', async () => {
    const dbdPath = settings.get('dbdPath');
    const result = configManager.lock(dbdPath);
    settings.set('configLocked', true);
    return result;
  });

  ipcMain.handle('config:unlock', async () => {
    const dbdPath = settings.get('dbdPath');
    const result = configManager.unlock(dbdPath);
    settings.set('configLocked', false);
    return result;
  });

  ipcMain.handle('config:lock-status', async () => {
    const dbdPath = settings.get('dbdPath');
    return configManager.isLocked(dbdPath);
  });

  // ── Upload ──
  ipcMain.handle('upload:screenshot', async (_, filePath) => {
    const token = settings.get('apiToken');
    if (!token) throw new Error('API token not configured. Set it in Settings.');
    return api.uploadScreenshot(filePath, token);
  });

  // ── Settings ──
  ipcMain.handle('settings:get', async (_, key) => {
    return settings.get(key);
  });

  ipcMain.handle('settings:set', async (_, key, value) => {
    settings.set(key, value);
    return true;
  });

  ipcMain.handle('settings:get-all', async () => {
    return settings.getAll();
  });

  // ── DBD auto-detect ──
  ipcMain.handle('dbd:detect', async () => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const results = [];
    const seen = new Set();

    function isValidDbd(dir) {
      try {
        const iconsPath = path.join(dir, 'DeadByDaylight', 'Content', 'UI', 'Icons');
        if (!fs.existsSync(iconsPath)) return false;
        const entries = fs.readdirSync(iconsPath);
        if (entries.length === 0) return false;
        const exePath = path.join(dir, 'DeadByDaylight', 'DeadByDaylight.exe');
        if (fs.existsSync(exePath)) return true;
        const hasSubdirs = entries.some(e => fs.statSync(path.join(iconsPath, e)).isDirectory());
        return hasSubdirs;
      } catch { return false; }
    }

    function addCandidate(dir) {
      const normalized = path.resolve(dir);
      if (seen.has(normalized)) return;
      seen.add(normalized);
      if (isValidDbd(normalized)) results.push(normalized);
    }

    const home = os.homedir();
    addCandidate(path.join(home, '.local/share/Steam/steamapps/common/Dead by Daylight'));
    addCandidate(path.join(home, '.steam/steam/steamapps/common/Dead by Daylight'));

    const vdfPaths = [
      path.join(home, '.local/share/Steam/steamapps/libraryfolders.vdf'),
      path.join(home, '.steam/steam/steamapps/libraryfolders.vdf'),
    ];
    for (const vdfPath of vdfPaths) {
      try {
        if (fs.existsSync(vdfPath)) {
          const content = fs.readFileSync(vdfPath, 'utf-8');
          const pathMatches = content.matchAll(/"path"\s+"([^"]+)"/g);
          for (const m of pathMatches) {
            if (m[1]) addCandidate(path.join(m[1], 'steamapps/common/Dead by Daylight'));
          }
        }
      } catch {}
    }

    const mounts = ['/mnt', '/media', '/run/media/' + home.split('/').pop()];
    for (const base of mounts) {
      try {
        if (fs.existsSync(base)) {
          for (const item of fs.readdirSync(base)) {
            addCandidate(path.join(base, item, 'Steam/steamapps/common/Dead by Daylight'));
            addCandidate(path.join(base, item, 'steamapps/common/Dead by Daylight'));
          }
        }
      } catch {}
    }
    return results;
  });

  // ── App info ──
  ipcMain.handle('app:info', async () => {
    return { version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node, platform: process.platform, userData: app.getPath('userData') };
  });

  // ── Game versions ──
  ipcMain.handle('game-versions', async () => {
    const https = require('https');
    return new Promise((resolve, reject) => {
      https.get('https://raw.githubusercontent.com/thatCleo/Nightlight_Pack_Downloader/main/game-versions.json', (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch (e) { reject(e); } });
      }).on('error', reject);
    });
  });
}

module.exports = { registerIpcHandlers };
