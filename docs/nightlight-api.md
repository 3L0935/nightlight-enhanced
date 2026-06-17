# API NightLight — Documentation

## Informations générales

- **Base URL** : `https://api.nightlight.gg/v1`
- **Website API** : `https://nightlight.gg/api/v1`
- **CDN** : `https://cdn.nightlight.gg`
- **Auth** : Bearer token (header `Authorization: Bearer <token>`)
- **Token** : Généré sur `https://nightlight.gg/account/api`
- **Rate limit** : Oui, pas de chiffre public. Attendre le retry period si limité.
- **Attribution** : Créditer NightLight comme source si les données sont partagées.

## Endpoints documentés (Swagger)

### POST /upload
Upload d'un screenshot de scoreboard.

**Request** :
```
POST https://api.nightlight.gg/v1/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <screenshot.jpg ou .png>
```

**Response 200** :
```json
{
  "status": "success",
  "data": {
    "url": "https://nightlight.gg/upload/12345678981234567"
  }
}
```

**Response 400** : Erreur (fichier invalide, etc.)
**Response 403** : Token API invalide

## Endpoints non documentés (découverts via reverse engineering du fork)

### GET /api/v1/packs
Liste des packs d'icônes.

**Request** :
```
GET https://nightlight.gg/api/v1/packs?page=1&per_page=12&sort_by=downloads&search=&author=&version=&includes=&include_mode=
```

**Paramètres** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `page` | int | Numéro de page (défaut: 1) |
| `per_page` | int | Résultats par page (défaut: 12) |
| `sort_by` | string | Tri : `downloads`, `name`, `last_updated`, `creation_date`, `game_version`, `random` |
| `search` | string | Recherche textuelle |
| `author` | string | Filtrer par auteur |
| `version` | string | Filtrer par version du jeu |
| `includes` | string | Types d'icônes inclus |
| `include_mode` | string | Mode d'inclusion |

**Response** :
```json
{
  "status": "success",
  "data": {
    "packs": [...],
    "variants": {...},
    "total_packs": 1528
  }
}
```

### GET /api/v1/packs/authors
Liste des auteurs de packs.

**Request** :
```
GET https://nightlight.gg/api/v1/packs/authors
```

**Response** :
```json
{
  "data": [
    { "name": "AuthorName", "id": "author_id" },
    ...
  ]
}
```

## CDN

Les bannières et avatars sont servis depuis `cdn.nightlight.gg` :

- Bannière : `https://cdn.nightlight.gg/packs/{pack_id}/{version}/banner.png`
- Avatar : `https://cdn.nightlight.gg/avatars/{user_id}/{avatar_id}.png`

## Notes

- L'API packs n'est **pas documentée officiellement** — elle peut changer sans préavis.
- Le fork thatCleo/Nightlight_Pack_Downloader est une bonne référence pour suivre les changements.
- Ne pas abuser des requêtes — NightLight est financé par donations.
