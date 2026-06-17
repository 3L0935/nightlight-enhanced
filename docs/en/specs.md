# Specifications — NightLight Enhanced

## 1. Context & Research

### 1.1 Official NightLight Desktop
- **Developer**: BritishBoop (boop.pro)
- **Stack**: Electron (probably Electron + vanilla JS or Vue)
- **Build**: electron-builder (NSIS for Windows, AppImage for Linux)
- **Config**: `settings.json` in `app.getPath('userData')` via `electron-settings`
  - Linux: `~/.config/nightlight-desktop/settings.json`
  - Windows: `%APPDATA%/nightlight-desktop/settings.json`
- **Linux beta**: available, but screenshot capture not supported
- **Not open source**: the dev explicitly stated open sourcing is financially complicated

### 1.2 NightLight API
- **Base**: `https://api.nightlight.gg/v1`
- **Auth**: Bearer token (generated at `https://nightlight.gg/account/api`)
- **Documented endpoints**:
  - `POST /upload` — upload a scoreboard screenshot (multipart/form-data, `file` field)
  - Response: `{ "status": "success", "data": { "url": "https://nightlight.gg/upload/..." } }`
- **Undocumented endpoints (discovered via fork reverse engineering)**:
  - `GET /api/v1/packs?page=N&per_page=N&sort_by=...&author=...&search=...&version=...&includes=...&include_mode=...`
  - `GET /api/v1/packs/authors` — list of pack authors
- **CDN**: `https://cdn.nightlight.gg/packs/{pack_id}/{version}/banner.png`
- **Rate limit**: yes, no public number — "wait for retry period"

### 1.3 Community fork (thatCleo/Nightlight_Pack_Downloader)
- **Stack**: Electron + vanilla JS
- **Features**: browse packs, download, install, revert, pack order
- **API used**: `https://nightlight.gg/api/v1/packs` (officially undocumented)
- **DBD path**: manually configurable
- **Limitations**: no upload, no config editor, no lock

### 1.4 DBD Icon Installation
- Custom icons go into the DBD game directory
- Typical Linux path (Proton): `~/.local/share/Steam/steamapps/common/DeadByDaylight/DeadByDaylight/Content/UI/Icons/`
- Typical Windows path: `C:\Program Files (x86)\Steam\steamapps\common\DeadByDaylight\DeadByDaylight\Content\UI\Icons\`
- Packs overwrite/add files in subdirectories (Perks, Items, etc.)

### 1.5 DBD Config / Auras
- The official NightLight Desktop `settings.json` stores user preferences
- DBD auras have RGBA values configurable via .ini files or the game's config
- Possible to edit aura colors (survivor/killer/item auras) through config files
- **To investigate**: exact structure of NightLight settings.json and DBD config files

## 2. Features

### 2.1 Icon Pack Manager (P1)
- Browse packs via NightLight API (pagination, search, filter by author/version)
- Download & install to DBD path
- Pack variant management
- Revert to default
- Pack priority ordering
- Update detection for installed packs

### 2.2 Config Editor (P1)
- Visual editor for Dead by Daylight's `GameUserSettings.ini`
- Linux target (Proton): `.../WindowsClient/GameUserSettings.ini`
- Windows target: `%LOCALAPPDATA%/DeadByDaylight/.../WindowsClient/GameUserSettings.ini`
- RGBA aura color editing (survivor/killer/item colors)
- Custom graphics settings (ScalabilityGroups, SystemSettings)
- Save with .ini format validation
- Change preview (where applicable)

### 2.3 Config Lock (P1)
- Read-only locking of `GameUserSettings.ini`
- Protection against overwriting by DBD game updates
- "Locked" mode with visual indicator
- Temporary unlock for modifications → auto re-lock

### 2.4 Match Upload (P2)
- NightLight connection (API token)
- Manual screenshot upload
- Auto-capture (optional, Linux)
- Upload status tracking
- Direct review link

### 2.5 Cross-platform (P2)
- Linux: AppImage, .deb (priority)
- Windows: portable .exe or NSIS installer
