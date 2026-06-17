# DBD Config & Auras — Research Notes

## NightLight Desktop settings.json

The official app stores its config in `app.getPath('userData')/settings.json`.

**Typical locations**:
- Linux: `~/.config/nightlight-desktop/settings.json`
- Windows: `%APPDATA%/nightlight-desktop/settings.json`
- macOS: `~/Library/Application Support/nightlight-desktop/settings.json`

**Probable content** (to be confirmed by direct inspection):
- DBD game path
- Capture quality settings
- Volume settings
- Auto-capture enabled/disabled
- Hotkey bindings
- **Aura colors** (RGBA) — mentioned by elo
- Pack order / installed packs list

## DBD Auras — Custom Colors

Auras in Dead by Daylight are controlled by the game's config files.

**Main file**: `GameUserSettings.ini`

**On Linux (Proton)**:
- `~/.local/share/Steam/steamapps/compatdata/381210/pfx/drive_c/users/steamuser/AppData/Local/DeadByDaylight/Saved/Config/WindowsClient/GameUserSettings.ini`

**On Windows**:
- `%LOCALAPPDATA%/DeadByDaylight/Saved/Config/WindowsClient/GameUserSettings.ini`

**Potential RGBA values**:
Auras are defined by hex or RGBA colors in .ini files. Examples of what can be customized:
- Survivor aura (usually yellow/white)
- Killer aura (usually red)
- Object/interactive aura
- Perk auras

**Note**: The exact structure of both NightLight settings.json and DBD config files for auras needs further investigation — ideally by installing the official app and inspecting generated files.

## Config Lock

**Mechanism**:
- `chmod 444` on the config file = read-only (lock)
- `chmod 644` = read-write (unlock)
- Detection: `fs.access(file, fs.constants.W_OK)` → if false, locked

**Protection against overwriting**:
- The official app can rewrite settings.json on every update
- Filesystem lock prevents writes but not delete + recreation
- Solution: `fs.watch` watcher on the file → if modification detected → re-lock + notification
- More robust alternative: backup copy + auto-restore

**Risks**:
- If the user launches the official app after locking, it may crash trying to write
- `chmod` doesn't work on all filesystems (FAT32, exFAT, some NAS)
- On Windows, equivalent: `ReadOnly` attributes + ACL
