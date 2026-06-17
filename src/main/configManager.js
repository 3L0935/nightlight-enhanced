const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const CONFIG_FILENAME = 'GameUserSettings.ini';

function getConfigPath(dbdPath) {
  if (!dbdPath) return null;

  // Linux Proton path
  const linuxPath = path.join(
    dbdPath.replace(/\/common\/DeadByDaylight.*$/, ''),
    'compatdata', '381210', 'pfx', 'drive_c',
    'users', 'steamuser', 'AppData', 'Local',
    'DeadByDaylight', 'Saved', 'Config', 'WindowsClient',
    CONFIG_FILENAME
  );

  // Windows path (direct)
  const winPath = path.join(
    dbdPath,
    'DeadByDaylight', 'Saved', 'Config', 'WindowsClient',
    CONFIG_FILENAME
  );

  if (process.platform === 'linux' && fs.existsSync(linuxPath)) {
    return linuxPath;
  }
  if (fs.existsSync(winPath)) {
    return winPath;
  }

  // Fallback: try to derive from DBD install path
  // On Linux, DBD is typically in steamapps/common/DeadByDaylight
  const compatDataMatch = dbdPath.match(/^(.*steamapps)\/common/);
  if (compatDataMatch) {
    const fallback = path.join(
      compatDataMatch[1], 'compatdata', '381210', 'pfx', 'drive_c',
      'users', 'steamuser', 'AppData', 'Local',
      'DeadByDaylight', 'Saved', 'Config', 'WindowsClient',
      CONFIG_FILENAME
    );
    if (fs.existsSync(fallback)) return fallback;
  }

  return null;
}

function readConfig(dbdPath) {
  const configPath = getConfigPath(dbdPath);
  if (!configPath) {
    throw new Error('GameUserSettings.ini not found. Configure your DBD path first.');
  }
  return {
    path: configPath,
    content: fs.readFileSync(configPath, 'utf-8')
  };
}

function writeConfig(dbdPath, content) {
  const configPath = getConfigPath(dbdPath);
  if (!configPath) {
    throw new Error('GameUserSettings.ini not found. Configure your DBD path first.');
  }
  fs.writeFileSync(configPath, content, 'utf-8');
  return { path: configPath };
}

function isLocked(dbdPath) {
  const configPath = getConfigPath(dbdPath);
  if (!configPath || !fs.existsSync(configPath)) return false;
  try {
    fs.accessSync(configPath, fs.constants.W_OK);
    return false; // writable = not locked
  } catch {
    return true; // not writable = locked
  }
}

function lock(dbdPath) {
  const configPath = getConfigPath(dbdPath);
  if (!configPath) throw new Error('Config not found');
  fs.chmodSync(configPath, 0o444);
  return true;
}

function unlock(dbdPath) {
  const configPath = getConfigPath(dbdPath);
  if (!configPath) throw new Error('Config not found');
  fs.chmodSync(configPath, 0o644);
  return true;
}

module.exports = {
  getConfigPath,
  readConfig,
  writeConfig,
  isLocked,
  lock,
  unlock
};
