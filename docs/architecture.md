# Architecture — NightLight Enhanced

## Stack technique

```
┌─────────────────────────────────────────────────────┐
│                    Electron App                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │              Main Process (main.js)              │ │
│  │  - Window management                             │ │
│  │  - IPC handlers                                  │ │
│  │  - File system ops (pack install, config lock)   │ │
│  │  - Auto-capture (screenshots)                   │ │
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

| Fichier | Rôle |
|---------|------|
| `main.js` | Entry point, window creation, app lifecycle |
| `ipc.js` | Tous les handlers IPC (pack install, config, upload) |
| `packManager.js` | Download, install, revert, update detection |
| `configManager.js` | Read/write settings.json, config lock (chmod) |
| `uploader.js` | Screenshot capture + upload via API |
| `api.js` | HTTP client pour NightLight API (packs + upload) |

### Renderer Process (`src/renderer/`)

| Fichier | Rôle |
|---------|------|
| `index.html` | Structure de l'app (sidebar + content) |
| `styles.css` | Thème dark, layout |
| `app.js` | Routing, navigation, state management |
| `pages/pack-browser.js` | Browse, search, filter packs |
| `pages/pack-manager.js` | Gérer les packs installés, ordre |
| `pages/config-editor.js` | Éditeur visuel de config |
| `pages/upload.js` | Upload de match |
| `pages/settings.js` | Settings généraux (DBD path, API token) |

### Shared (`src/shared/`)

| Fichier | Rôle |
|---------|------|
| `constants.js` | Paths, URLs, defaults |
| `utils.js` | Helpers (formatage, validation) |

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

## Stockage local

| Donnée | Format | Emplacement |
|--------|--------|-------------|
| API token | JSON (chiffré) | `userData/token.json` |
| Installed packs registry | JSON | `userData/installed-packs.json` |
| Settings | JSON | `userData/settings.json` |
| Cached images | PNG | `userData/cached_images/` |
| Screenshots | PNG/JPG | `userData/screenshots/` |

## Config Lock

Le lock est implémenté au niveau filesystem :
- **Lock** : `chmod 444` sur `settings.json` (lecture seule)
- **Unlock** : `chmod 644` (lecture/écriture)
- **Détection** : `fs.access` avec `W_OK` pour vérifier si locked
- **Protection** : le main process vérifie le lock avant chaque write
- **Edge case** : si l'app officielle tourne en parallèle, elle peut re-écraser — prévenir l'utilisateur

## API NightLight

### Packs (non documenté, découvert via fork)
```
GET https://nightlight.gg/api/v1/packs?page=1&per_page=12&sort_by=downloads&search=&author=&version=&includes=&include_mode=
GET https://nightlight.gg/api/v1/packs/authors
```

### Upload (documenté)
```
POST https://api.nightlight.gg/v1/upload
Headers: Authorization: Bearer <token>
Body: multipart/form-data { file: <screenshot> }
Response: { status: "success", data: { url: "..." } }
```

### Auth
- Token généré sur `https://nightlight.gg/account/api`
- Stocké localement, option de le chiffrer
- Permissions : upload, read packs
