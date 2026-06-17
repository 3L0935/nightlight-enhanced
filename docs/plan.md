# Plan d'implémentation — NightLight Enhanced

## Phases

### Phase 1 : Skeleton Electron + Pack Browser (P1)
**Objectif** : App Electron fonctionnelle avec browse/install de packs.

| # | Tâche | Description | Dépendances |
|---|-------|-------------|-------------|
| 1.1 | Init projet Electron | `npm init`, Electron, electron-builder, structure dossiers | — |
| 1.2 | Main process | `main.js` : window, IPC setup, app lifecycle | 1.1 |
| 1.3 | API client | Module HTTP pour NightLight API (packs list, authors) | 1.1 |
| 1.4 | Pack browser UI | Browse, search, filter, pagination | 1.2, 1.3 |
| 1.5 | Pack install | Download CDN → extract → copier dans DBD path | 1.2, 1.4 |
| 1.6 | Pack manager UI | Liste des packs installés, ordre, revert | 1.5 |
| 1.7 | DBD path config | Settings panel pour configurer le path DBD | 1.2 |
| 1.8 | Packaging Linux | AppImage + .deb via electron-builder | 1.1 |

**Livrable** : App qui browse, installe et gère les packs d'icônes.

### Phase 2 : Config Editor + Lock (P1)
**Objectif** : Éditeur visuel du settings.json + protection read-only.

| # | Tâche | Description | Dépendances |
|---|-------|-------------|-------------|
| 2.1 | Config reader | Lire/parser le settings.json NightLight | 1.2 |
| 2.2 | Config editor UI | Interface d'édition (RGBA auras, graphismes) | 2.1 |
| 2.3 | Config validation | Valider les valeurs avant écriture | 2.2 |
| 2.4 | Config lock | `chmod 444` / `chmod 644`, détection état | 1.2 |
| 2.5 | Lock UI | Indicateur visuel, toggle lock/unlock | 2.4 |
| 2.6 | Protection update | Watcher pour détecter écrasement par app officielle | 2.4 |

**Livrable** : Éditeur de config fonctionnel avec lock.

### Phase 3 : Match Upload (P2)
**Objectif** : Upload de screenshots vers NightLight.

| # | Tâche | Description | Dépendances |
|---|-------|-------------|-------------|
| 3.1 | API token config | Interface pour entrer/stocker le token | 1.2 |
| 3.2 | Upload client | POST multipart vers `/v1/upload` | 1.3, 3.1 |
| 3.3 | Upload UI | Sélecteur de fichier, progression, résultat | 3.2 |
| 3.4 | Auto-capture (Linux) | Capture d'écran automatisée (via `import`/`maim`/`spectacle`) | 3.2 |

**Livrable** : Upload de match fonctionnel.

### Phase 4 : Polish & Packaging (P2)
**Objectif** : Finalisation, packaging Windows, documentation.

| # | Tâche | Description | Dépendances |
|---|-------|-------------|-------------|
| 4.1 | Windows packaging | NSIS installer + portable | 1.8 |
| 4.2 | macOS packaging | .dmg (si pertinent) | 1.8 |
| 4.3 | Auto-updater | Vérification de mise à jour au démarrage | 1.2 |
| 4.4 | Documentation | README complet, captures d'écran | — |
| 4.5 | Tests | Test manuel sur Linux + Windows | Toutes |

## Priorisation

```
Phase 1 ████████████████████████████████  (semaine 1)
Phase 2 ██████████████████████            (semaine 2)
Phase 3 ████████████                      (semaine 3)
Phase 4 ██████████                        (semaine 4)
```

## Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| API NightLight non documentée change | Bloquant Phase 1 | Monitorer le fork thatCleo pour les changements |
| DBD update casse les paths d'icônes | Bloquant Phase 1 | `game-versions.json` dynamique comme le fork |
| EAC flag l'app | Critique | Utiliser les mêmes méthodes que l'app officielle (screenshot standard) |
| App officielle écrase la config | Moyen | Config lock + watcher + notification |
| Rate limiting API | Ralentissement | Cache local, requêtes espacées |

## Dépendances npm

```json
{
  "electron": "^latest",
  "electron-builder": "^latest",
  "electron-store": "^8"  // ou electron-settings
}
```

Pas de framework frontend — vanilla JS pour rester léger et compatible avec l'approche du fork.
