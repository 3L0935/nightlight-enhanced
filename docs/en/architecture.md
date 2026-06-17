# Architecture — NightLight Enhanced

## Tech Stack

```
┌─────────────────────────────────────────────────────┐
│                    Electron App                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │              Main Process (main.js)              │ │
│  │  - Window management                             │ │
│  │  - IPC handlers                                  │ │
│  │  - File system ops (pack install, config lock)   │ │
│  │  - Auto-capture (screenshots)                    │ │
│  └──────────────┬──────────────────────────────────┘ │
│                 │ IPC                                 │
│  ┌──────────────▼──────────────────────────────────┐ │
│  │           Renderer Process (UI)                 │ │
│  │  - Pack browser (webview + custom UI)           │ │
│  │  - Config editor                                │ │
│  │  - Upload manager                               │ │
│  │  - Settings panel                               │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌─────────────────────┐
│  NightLight API  │    │  DBD Game Files     │
│  api.nightlight.gg│    │  ~/.../DeadByDaylight│
│  - /v1/upload    │    │  /Content/UI/Icons/ │
│  - /api/v1/packs │    └─────────────────────┘
│  - /api/v1/packs │
│    /authors      │
└─────────────────┘
```

## Modules

### Main Process (`src/main/`)

| File | Role |
|------|------|
| `main.js` | Entry point, window creation, app lifecycle |
| `ipc.js` | All IPC handlers (pack install, config, upload) |
| `packManager.js` | Download, install, revert, update detection |
| `configManager.js` | Read/write settings.json, config lock (chmod) |
| `uploader.js` | Screenshot capture + upload via API |
| `api.js` | HTTP client for NightLight API (packs + upload) |

### Renderer Process (`src/renderer/`)

| File | Role |
|------|------|
| `index.html` | App shell (sidebar + content) |
| `styles.css` | Dark theme, layout |
| `app.js` | Routing, navigation, state management |
| `pages/pack-browser.js` | Browse, search, filter packs |
| `pages/pack-manager.js` | Manage installed packs, order |
| `pages/config-editor.js` | Visual config editor |
| `pages/upload.js` | Match upload |
| `pages/settings.js` | General settings (DBD path, API token) |

### Shared (`src/shared/`)

| File | Role |
|------|------|
| `constants.js` | Paths, URLs, defaults |
| `utils.js` | Helpers (formatting, validation) |

## Data Flow

### Pack Installation
```
Renderer: click "Install" → IPC: install-pack
  → Main: download from CDN → extract → copy to DBD path
  → Main: update local registry (installed packs list)
  → Renderer: refresh UI
```

### Config Edit
```
Renderer: edit value → IPC: write-config
  → Main: read settings.json → apply change → write
  → Main: if locked → chmod 444
  → Renderer: confirm + refresh
```

### Config Lock
```
Renderer: toggle lock → IPC: lock-config / unlock-config
  → Main: chmod 444 (lock) / chmod 644 (unlock)
  → Renderer: update lock indicator
```

### Match Upload
```
Renderer: select file → IPC: upload-screenshot
  → Main: POST /v1/upload (multipart, Bearer token)
  → Main: return response URL
  → Renderer: show result
```

## Local Storage

| Data | Format | Location |
|------|--------|----------|
| API token | JSON (encrypted) | `userData/token.json` |
| Installed packs registry | JSON | `userData/installed-packs.json` |
| Settings | JSON | `userData/settings.json` |
| Cached images | PNG | `userData/cached_images/` |
| Screenshots | PNG/JPG | `userData/screenshots/` |

## Config Lock

The lock is implemented at the filesystem level:
- **Lock**: `chmod 444` on `settings.json` (read-only)
- **Unlock**: `chmod 644` (read/write)
- **Detection**: `fs.access` with `W_OK` to check if locked
- **Protection**: the main process checks the lock before each write
- **Edge case**: if the official app runs in parallel, it can still overwrite — warn the user

## API NightLight

### Packs (undocumented, discovered via fork)
```
GET https://nightlight.gg/api/v1/packs?page=1&per_page=12&sort_by=downloads&search=&author=&version=&includes=&include_mode=
GET https://nightlight.gg/api/v1/packs/authors
```

### Upload (documented)
```
POST https://api.nightlight.gg/v1/upload
Headers: Authorization: Bearer ***
Body: multipart/form-data { file: <screenshot> }
Response: { status: "success", data: { url: "..." } }
```

### Auth
- Token generated at `https://nightlight.gg/account/api`
- Stored locally, optional encryption
- Permissions: upload, read packs
