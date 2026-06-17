const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nightlight', {
  // Packs
  fetchPacks: (params) => ipcRenderer.invoke('packs:fetch', params),
  fetchAuthors: () => ipcRenderer.invoke('packs:authors'),
  fetchBanner: (packId, version) => ipcRenderer.invoke('packs:banner', packId, version),
  fetchPackPreview: (packUrl, packId, version) => ipcRenderer.invoke('packs:preview', packUrl, packId, version),
  getPreviewProgress: () => ipcRenderer.invoke('packs:preview-progress'),
  installPack: (packUrl, title, categories) => ipcRenderer.invoke('packs:install', packUrl, title, categories),
  updatePackCategories: (packId, categories) => ipcRenderer.invoke('packs:update-categories', packId, categories),
  getInstalledPacks: () => ipcRenderer.invoke('packs:get-installed'),
  removePack: (packId) => ipcRenderer.invoke('packs:remove', packId),
  setPackOrder: (order) => ipcRenderer.invoke('packs:set-order', order),
  revertToDefault: () => ipcRenderer.invoke('packs:revert-default'),

  // Config
  readConfig: () => ipcRenderer.invoke('config:read'),
  writeConfig: (content) => ipcRenderer.invoke('config:write', content),
  getConfigPath: () => ipcRenderer.invoke('config:path'),
  lockConfig: () => ipcRenderer.invoke('config:lock'),
  unlockConfig: () => ipcRenderer.invoke('config:unlock'),
  getConfigLockStatus: () => ipcRenderer.invoke('config:lock-status'),

  // Upload
  uploadScreenshot: (filePath) => ipcRenderer.invoke('upload:screenshot', filePath),

  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getAllSettings: () => ipcRenderer.invoke('settings:get-all'),

  // App info
  getAppInfo: () => ipcRenderer.invoke('app:info'),

  // DBD auto-detect
  detectDbdPath: () => ipcRenderer.invoke('dbd:detect'),

  // Install from preview cache (no re-download)
  installFromPreview: (packUrl, packTitle, categories) => ipcRenderer.invoke('packs:install-from-preview', packUrl, packTitle, categories),

  // Game versions
  fetchGameVersions: () => ipcRenderer.invoke('game-versions'),

  // Events from main
  onConfigOverwritten: (callback) => ipcRenderer.on('config:overwritten', (_, data) => callback(data)),
  onInstallProgress: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('install-progress', handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener('install-progress', handler);
  }
});
