# NightLight Enhanced

A cross-platform desktop companion for Dead by Daylight icon pack management and config tuning.

Built with Electron. Linux first. Works on Windows too.

> **Credits:** This project was built by **X.A.N.A** (an autonomous Hermes AI agent) working under the direction of **3L0\_**. The user provided the ideas, workflow, and domain expertise — the agent wrote the code. A collaboration between human intent and machine execution.  
> NightLight originally created by **britishboop**. This is an enhanced fork of the community-maintained desktop client.

## Features

### Icon Pack Manager
- **Browse** packs from [nightlight.gg](https://nightlight.gg) — search, filter by author/game version
- **Preview** every icon in a pack before installing — all perks, powers, items, add-ons, offerings, status effects, actions
- **Selective install** — choose which categories to install, not the whole pack
- **Smart caching** — preview once, install later without re-downloading
- **Persistent storage** — packs stay cached between sessions
- **Live progress** — download/install progress with percentage and file count

### Config Editor
- **Pretty mode** — organized form with sections, sliders, color pickers, toggles
  - **Scalability** — all 13 graphics quality settings with per-value performance impact indicators
  - **Video** — resolution, FPS limit (capped at 120 — DBD engine limitation), anti-aliasing, FSR
  - **Audio** — volumes, headphone mode
  - **Accessibility** — HUD scale, colorblind mode, subtitles
  - **Aura Colors** — full RGB+A editing for all 12 in-game aura types with live preview
  - **Scratch Marks** — color picker for scratch marks
- **Quick presets** — Performance / Balanced / Quality — apply graphics presets in one click
- **Raw mode** — direct INI text editing for advanced users
- **Toggle switch** — smooth Pretty/Raw mode toggle
- **Config lock** — set `chmod 444` on `GameUserSettings.ini` to prevent the game from overwriting your changes

### Screenshot Upload
- Capture and upload match screenshots to nightlight.gg
- Drag & drop or file picker
- Auto-delete after upload option

## Install

```bash
git clone https://github.com/3L0935/nightlight-enhanced.git
cd nightlight-enhanced
npm install
npm start
```

### Build (Linux)

```bash
npx electron-builder --linux AppImage
```

### DBD Path Setup

Set your Dead by Daylight installation path in Settings:
- Linux (Proton): `~/SSD/SteamLibrary/steamapps/common/Dead by Daylight`
- Windows: `C:\Program Files (x86)\Steam\steamapps\common\Dead by Daylight`

The icon installer writes to `DeadByDaylight/Content/UI/Icons/` relative to your game root.

## Stack

- **Electron** 39+ — desktop framework
- **Vanilla HTML/CSS/JS** — no framework overhead
- **SVG linear icons** — custom icon set, zero emoji
- **NightLight API** — pack listing, banner CDN, screenshot upload

## Project Structure

```
nightlight-enhanced/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.js       # Window, session interceptors
│   │   ├── ipc.js        # IPC handlers (packs, config, upload, settings)
│   │   ├── api.js        # HTTP client + pack preview cache
│   │   ├── packManager.js# Install/uninstall/revert logic
│   │   ├── configManager.js# INI read/write/lock
│   │   ├── preload.js    # Context bridge (25+ channels)
│   │   └── settings.js   # electron-store schema
│   └── renderer/       # UI
│       ├── index.html     # Single-page app shell
│       ├── styles.css     # Full dark theme
│       ├── icons.js       # SVG linear icon set
│       ├── app.js         # Navigation, notifications, lock indicator
│       ├── config-parser.js  # INI parser + field definitions
│       ├── config-pretty.js  # Pretty mode renderer
│       └── pages/
│           ├── pack-browser.js   # Pack listing, search, preview, install
│           ├── pack-manager.js   # Installed packs management
│           ├── config-editor.js  # Config editor (pretty + raw)
│           ├── upload.js         # Screenshot upload
│           └── settings.js       # DBD path, API token, preferences
├── docs/
│   ├── nightlight-api.md  # API documentation
│   └── dbd-config.md      # Config file reference
├── package.json
└── README.md
```

## Roadmap

- [x] Pack browser with preview
- [x] Selective install with progress
- [x] Config editor (pretty + raw)
- [x] Aura color editor
- [x] Config lock
- [ ] Finalize aura customization list
- [ ] Screenshot upload rework (proper API integration)
- [ ] Upload stats & match history
- [ ] Windows build testing
- [ ] Auto-updater
- [ ] Keyboard shortcuts

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) — free to use, modify, and distribute.
