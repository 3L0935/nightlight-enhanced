# Implementation Plan — NightLight Enhanced

## Phases

### Phase 1: Electron Skeleton + Pack Browser (P1)
**Goal**: Functional Electron app with pack browse/install.

| # | Task | Description | Dependencies |
|---|------|-------------|-------------|
| 1.1 | Init Electron project | `npm init`, Electron, electron-builder, folder structure | — |
| 1.2 | Main process | `main.js`: window creation, IPC setup, app lifecycle | 1.1 |
| 1.3 | API client | HTTP module for NightLight API (packs list, authors) | 1.1 |
| 1.4 | Pack browser UI | Browse, search, filter, pagination | 1.2, 1.3 |
| 1.5 | Pack install | Download CDN → extract → copy to DBD path | 1.2, 1.4 |
| 1.6 | Pack manager UI | Installed packs list, order, revert | 1.5 |
| 1.7 | DBD path config | Settings panel to configure DBD path | 1.2 |
| 1.8 | Linux packaging | AppImage + .deb via electron-builder | 1.1 |

**Deliverable**: App that browses, installs, and manages icon packs.

### Phase 2: Config Editor + Lock (P1)
**Goal**: Visual editor for settings.json + read-only protection.

| # | Task | Description | Dependencies |
|---|------|-------------|-------------|
| 2.1 | Config reader | Read/parse NightLight settings.json | 1.2 |
| 2.2 | Config editor UI | Editing interface (RGBA auras, graphics) | 2.1 |
| 2.3 | Config validation | Validate values before writing | 2.2 |
| 2.4 | Config lock | `chmod 444` / `chmod 644`, state detection | 1.2 |
| 2.5 | Lock UI | Visual indicator, lock/unlock toggle | 2.4 |
| 2.6 | Update protection | Watcher to detect overwrite by official app | 2.4 |

**Deliverable**: Functional config editor with lock.

### Phase 3: Match Upload (P2)
**Goal**: Upload screenshots to NightLight.

| # | Task | Description | Dependencies |
|---|------|-------------|-------------|
| 3.1 | API token config | Interface for entering/storing the token | 1.2 |
| 3.2 | Upload client | POST multipart to `/v1/upload` | 1.3, 3.1 |
| 3.3 | Upload UI | File picker, progress, result display | 3.2 |
| 3.4 | Auto-capture (Linux) | Automated screenshot capture (via `import`/`maim`/`spectacle`) | 3.2 |

**Deliverable**: Functional match upload.

### Phase 4: Polish & Packaging (P2)
**Goal**: Finalization, Windows packaging, documentation.

| # | Task | Description | Dependencies |
|---|------|-------------|-------------|
| 4.1 | Windows packaging | NSIS installer + portable | 1.8 |
| 4.2 | macOS packaging | .dmg (if relevant) | 1.8 |
| 4.3 | Auto-updater | Update check on startup | 1.2 |
| 4.4 | Documentation | Full README, screenshots | — |
| 4.5 | Testing | Manual testing on Linux + Windows | All |

## Prioritization

```
Phase 1 ████████████████████████████████  (week 1)
Phase 2 ██████████████████████            (week 2)
Phase 3 ████████████                      (week 3)
Phase 4 ██████████                        (week 4)
```

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Undocumented NightLight API changes | Blocking Phase 1 | Monitor thatCleo fork for changes |
| DBD update breaks icon paths | Blocking Phase 1 | Dynamic `game-versions.json` like the fork |
| EAC flags the app | Critical | Use same methods as official app (standard screenshot) |
| Official app overwrites config | Medium | Config lock + watcher + notification |
| API rate limiting | Slowdown | Local cache, spaced requests |

## npm Dependencies

```json
{
  "electron": "^latest",
  "electron-builder": "^latest",
  "electron-store": "^8"
}
```

No frontend framework — vanilla JS to stay lightweight and compatible with the fork's approach.
