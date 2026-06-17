# Config DBD & Auras — Notes de recherche

## settings.json NightLight Desktop

L'app officielle stocke sa config dans `app.getPath('userData')/settings.json`.

**Emplacements typiques** :
- Linux : `~/.config/nightlight-desktop/settings.json`
- Windows : `%APPDATA%/nightlight-desktop/settings.json`
- macOS : `~/Library/Application Support/nightlight-desktop/settings.json`

**Contenu probable** (à confirmer par inspection directe) :
- DBD game path
- Capture quality settings
- Volume settings
- Auto-capture enabled/disabled
- Hotkey bindings
- **Couleurs d'aura** (RGBA) — mentionné par elo
- Pack order / installed packs list

## Auras DBD — Couleurs customs

Les auras dans Dead by Daylight sont contrôlées par des fichiers de config du jeu.

**Fichier principal** : `GameUserSettings.ini`

**Sous Linux (Proton)** :
- `~/.local/share/Steam/steamapps/compatdata/381210/pfx/drive_c/users/steamuser/AppData/Local/DeadByDaylight/Saved/Config/WindowsClient/GameUserSettings.ini`

**Sous Windows** :
- `%LOCALAPPDATA%/DeadByDaylight/Saved/Config/WindowsClient/GameUserSettings.ini`

**Valeurs RGBA potentielles** :
Les auras sont définies par des couleurs hex ou RGBA dans les fichiers .ini. Exemples de ce qui peut être customisé :
- Aura du survivant (généralement jaune/blanc)
- Aura du tueur (généralement rouge)
- Aura des objets/interactifs
- Aura des perks

**Note** : La structure exacte du settings.json NightLight et des fichiers de config DBD pour les auras est à investiguer plus en détail — idéalement en installant l'app officielle et en inspectant les fichiers générés.

## Config Lock

**Mécanisme** :
- `chmod 444` sur le fichier de config = read-only (lock)
- `chmod 644` = read-write (unlock)
- Détection : `fs.access(file, fs.constants.W_OK)` → si false, locked

**Protection contre l'écrasement** :
- L'app officielle peut réécrire le settings.json à chaque mise à jour
- Le lock filesystem empêche l'écriture mais pas la suppression + recréation
- Solution : watcher `fs.watch` sur le fichier → si détecte modification → re-lock + notification
- Alternative plus robuste : copie de backup + restore automatique

**Risques** :
- Si l'utilisateur lance l'app officielle après avoir locké, elle peut crasher en essayant d'écrire
- `chmod` ne fonctionne pas sur tous les filesystems (FAT32, exFAT, certains NAS)
- Sous Windows, équivalent : attributs `ReadOnly` + ACL
