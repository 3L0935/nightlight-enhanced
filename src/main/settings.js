const Store = require('electron-store');

const schema = {
  dbdPath: {
    type: 'string',
    default: ''
  },
  apiToken: {
    type: 'string',
    default: ''
  },
  captureQuality: {
    type: 'string',
    enum: ['high', 'medium', 'low'],
    default: 'high'
  },
  autoCapture: {
    type: 'boolean',
    default: false
  },
  keepScreenshots: {
    type: 'string',
    enum: ['all', 'delete-after-upload', 'keep-last-100'],
    default: 'delete-after-upload'
  },
  configLocked: {
    type: 'boolean',
    default: false
  },
  uiScale: {
    type: 'number',
    minimum: 0.8,
    maximum: 1.6,
    default: 1
  }
};

const store = new Store({ schema });

module.exports = {
  get(key) { return store.get(key); },
  set(key, value) { store.set(key, value); },
  getAll() { return store.store; }
};
