# Contributing to NightLight Enhanced

Thanks for wanting to contribute. This project is built with Electron + vanilla JS — no framework, no bundler. Keep it that way.

## Quick Start

```bash
git clone git@github.com:3L0935/nightlight-enhanced.git
cd nightlight-enhanced
npm install
npm start
```

## Project Structure

```
src/
├── main/               # Electron main process (Node.js)
│   ├── main.js           # Window creation, session hooks
│   ├── ipc.js            # All IPC handlers in one file
│   ├── api.js            # HTTP client, pack download, preview cache
│   ├── packManager.js    # Install/uninstall, packfiles directory management
│   ├── configManager.js  # INI read/write, chmod lock
│   ├── preload.js        # contextBridge definitions
│   └── settings.js       # electron-store wrapper
└── renderer/           # UI (vanilla HTML/CSS/JS)
    ├── index.html         # App shell, page containers
    ├── styles.css         # Single CSS file, dark theme
    ├── app.js             # Navigation, notifications, shared helpers
    ├── icons.js           # SVG linear icon set
    ├── config-parser.js   # INI parser + field metadata
    ├── config-pretty.js   # Pretty config mode renderer
    └── pages/
        ├── pack-browser.js   # Pack grid, search, preview, install
        ├── pack-manager.js   # Installed packs list
        ├── config-editor.js  # Config editor page logic
        ├── upload.js         # Screenshot upload page
        └── settings.js       # Settings page
```

## Architecture Rules

- **No frameworks.** No React, Vue, Svelte, Tailwind. DOM manipulation is done with `innerHTML`, `querySelector`, and event listeners.
- **One CSS file.** `styles.css` contains everything. Add new sections at the bottom.
- **IPC is the boundary.** The renderer never touches the filesystem or network directly. All I/O goes through `window.nightlight.*` via the preload bridge.
- **Main process is thin.** Most logic lives in `api.js` and `packManager.js`. `ipc.js` just wires handlers to these modules.
- **SVG icons only.** No emoji, no icon fonts. `icons.js` exports an `icon(name)` function that returns inline SVG strings.

## Code Style

- No semicolons (unless required by ASI edge cases)
- 2-space indentation
- Single quotes for strings
- Template literals for concatenation
- `function` keyword over arrow functions for top-level definitions
- Arrow functions for callbacks and one-liners
- Descriptive variable names over brevity

## Pull Request Process

1. Open an issue first describing what you're fixing or adding.
2. Fork the repo and create a branch from `main`.
3. Keep changes focused — one PR = one concern.
4. Test manually by running the app and exercising your change.
5. Update `README.md` if your change adds a user-facing feature.
6. Submit the PR with a clear description of what changed and why.

## What Not To Do

- Don't add dependencies without a compelling reason. Every dep is a maintenance burden.
- Don't touch `package-lock.json` unless you're intentionally updating a dependency.
- Don't reformat existing code — style consistency beats personal preference.
- Don't add compile steps, bundlers, or transpilers. What you write is what runs.
- Don't add TypeScript. This project runs on bare V8.

## First-Time Ideas

- Fix aura color parsing edge case (the INI format is fragile)
- Add a new preset config
- Improve the upload page with real API integration
- Test on Windows and fix platform bugs
- Add keyboard shortcuts (navigation, search focus, etc.)
