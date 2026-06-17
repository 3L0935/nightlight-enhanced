# Spécifications — NightLight Enhanced

## 1. Contexte & Recherche

### 1.1 NightLight Desktop officiel
- **Développeur** : BritishBoop (boop.pro)
- **Stack** : Electron (probablement Electron + vanilla JS ou Vue)
- **Build** : electron-builder (NSIS pour Windows, AppImage pour Linux)
- **Config** : `settings.json` dans `app.getPath('userData')` via `electron-settings`
  - Linux : `~/.config/nightlight-desktop/settings.json`
  - Windows : `%APPDATA%/nightlight-desktop/settings.json`
- **Linux beta** : disponible, mais screenshot capture non supporté
- **Non open source** : le dev a explicitement dit que l'open source est compliqué financièrement

### 1.2 API NightLight
- **Base** : `https://api.nightlight.gg/v1`
- **Auth** : Bearer token (généré sur `https://nightlight.gg/account/api`)
- **Endpoints documentés** :
  - `POST /upload` — upload d'un screenshot scoreboard (multipart/form-data, champ `file`)
  - Response : `{ "status": "success", "data": { "url": "https://nightlight.gg/upload/..." } }`
- **Endpoints non documentés (découverts via reverse du fork)** :
  - `GET /api/v1/packs?page=N&per_page=N&sort_by=...&author=...&search=...&version=...&includes=...&include_mode=...`
  - `GET /api/v1/packs/authors` — liste des auteurs
- **CDN** : `https://cdn.nightlight.gg/packs/{pack_id}/{version}/banner.png`
- **Rate limit** : oui, pas de chiffre public — "wait for retry period"

### 1.3 Fork communautaire (thatCleo/Nightlight_Pack_Downloader)
- **Stack** : Electron + vanilla JS
- **Features** : browse packs, download, install, revert, pack order
- **API utilisée** : `https://nightlight.gg/api/v1/packs` (non documenté officiellement)
- **DBD path** : configurable manuellement
- **Limites** : pas d'upload, pas d'édition de config, pas de lock

### 1.4 Installation des icônes DBD
- Les icônes customs vont dans le dossier du jeu DBD
- Path typique Linux (Proton) : `~/.local/share/Steam/steamapps/common/DeadByDaylight/DeadByDaylight/Content/UI/Icons/`
- Path typique Windows : `C:\Program Files (x86)\Steam\steamapps\common\DeadByDaylight\DeadByDaylight\Content\UI\Icons\`
- Les packs écrasent/ajoutent des fichiers dans les sous-dossiers (Perks, Items, etc.)

### 1.5 Config DBD / Auras
- Le `settings.json` de NightLight Desktop stocke des préférences utilisateur
- Les auras DBD ont des valeurs RGBA configurables via les fichiers .ini ou la config du jeu
- Possibilité d'éditer les couleurs d'aura (survivor/killer/item auras) via des fichiers de config
- **À investiguer** : structure exacte du settings.json NightLight et des fichiers de config DBD

## 2. Features

### 2.1 Icon Pack Manager (P1)
- Browse packs via l'API NightLight (pagination, search, filter by author/version)
- Download & install dans le path DBD
- Gestion des variantes de packs
- Revert to default
- Ordre de priorité des packs
- Détection des mises à jour disponibles

### 2.2 Config Editor (P1)
- Éditeur visuel du `GameUserSettings.ini` de Dead by Daylight
- Cible Linux (Proton) : `.../WindowsClient/GameUserSettings.ini`
- Cible Windows : `%LOCALAPPDATA%/DeadByDaylight/.../WindowsClient/GameUserSettings.ini`
- Édition des valeurs RGBA des auras (couleurs survivor/killer/item)
- Édition des paramètres graphiques customs (ScalabilityGroups, SystemSettings)
- Sauvegarde avec validation du format .ini
- Preview des changements (si applicable)

### 2.3 Config Lock (P1)
- Verrouillage read-only du `GameUserSettings.ini`
- Protection contre l'écrasement par les mises à jour du jeu DBD
- Mode "locked" avec indicateur visuel
- Unlock temporaire pour modifications → re-lock automatique

### 2.4 Match Upload (P2)
- Connexion à NightLight (API token)
- Upload manuel de screenshots
- Auto-capture (optionnel, Linux)
- Suivi du statut d'upload
- Review link direct

### 2.5 Cross-platform (P2)
- Linux : AppImage, .deb (prioritaire)
- Windows : portable .exe ou NSIS installer
- macOS : .dmg (si pertinent)

## 3. Contraintes

- **Respect de l'API NightLight** : rate limiting, créditer NightLight comme source
- **Pas de reverse engineering du binaire officiel** : on utilise l'API publique + le fork open source comme référence
- **Sécurité** : le token API est stocké localement (chiffré ou en keychain)
- **DBD EAC** : l'app officielle n'a jamais causé de ban — on suit les mêmes pratiques (screenshot standard, pas d'injection mémoire)
