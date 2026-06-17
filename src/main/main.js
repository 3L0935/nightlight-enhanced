const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./ipc');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  const defaultSession = session.defaultSession;

  // Strip restrictive headers from CDN responses so file:// can load images
  defaultSession.webRequest.onHeadersReceived(
    { urls: ['https://cdn.nightlight.gg/*'] },
    (details, callback) => {
      const headers = { ...details.responseHeaders };
      // Remove CORP (cross-origin-resource-policy) which blocks file://
      delete headers['cross-origin-resource-policy'];
      // Override content-type to match the .png extension in our src attributes
      // The CDN actually serves webp but we request .png — force image/*
      if (headers['content-type']) {
        headers['content-type'] = ['image/*'];
      }
      callback({ responseHeaders: headers });
    }
  );

  // Also spoof referrer so CDN doesn't 403
  defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://cdn.nightlight.gg/*'] },
    (details, callback) => {
      const headers = { ...details.requestHeaders };
      headers['Origin'] = 'https://nightlight.gg';
      headers['Referer'] = 'https://nightlight.gg/';
      callback({ requestHeaders: headers });
    }
  );

  registerIpcHandlers(ipcMain);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
