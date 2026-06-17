# NightLight API — Documentation

## General Information

- **Base URL**: `https://api.nightlight.gg/v1`
- **Website API**: `https://nightlight.gg/api/v1`
- **CDN**: `https://cdn.nightlight.gg`
- **Auth**: Bearer token (header `Authorization: Bearer ***`)
- **Token**: Generated at `https://nightlight.gg/account/api`
- **Rate limit**: Yes, no public number. Wait for the retry period if limited.
- **Attribution**: Credit NightLight as source if data is shared.

## Documented Endpoints (Swagger)

### POST /upload
Upload a scoreboard screenshot.

**Request**:
```
POST https://api.nightlight.gg/v1/upload
Authorization: Bearer ***
Content-Type: multipart/form-data

file: <screenshot.jpg or .png>
```

**Response 200**:
```json
{
  "status": "success",
  "data": {
    "url": "https://nightlight.gg/upload/12345678981234567"
  }
}
```

**Response 400**: Error (invalid file, etc.)
**Response 403**: Invalid API token

## Undocumented Endpoints (discovered via fork reverse engineering)

### GET /api/v1/packs
List icon packs.

**Request**:
```
GET https://nightlight.gg/api/v1/packs?page=1&per_page=12&sort_by=downloads&search=&author=&version=&includes=&include_mode=
```

**Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | int | Page number (default: 1) |
| `per_page` | int | Results per page (default: 12) |
| `sort_by` | string | Sort: `downloads`, `name`, `last_updated`, `creation_date`, `game_version`, `random` |
| `search` | string | Text search |
| `author` | string | Filter by author |
| `version` | string | Filter by game version |
| `includes` | string | Included icon types |
| `include_mode` | string | Inclusion mode |

**Response**:
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
List pack authors.

**Request**:
```
GET https://nightlight.gg/api/v1/packs/authors
```

**Response**:
```json
{
  "data": [
    { "name": "AuthorName", "id": "author_id" },
    ...
  ]
}
```

## CDN

Banners and avatars are served from `cdn.nightlight.gg`:

- Banner: `https://cdn.nightlight.gg/packs/{pack_id}/{version}/banner.png`
- Avatar: `https://cdn.nightlight.gg/avatars/{user_id}/{avatar_id}.png`

## Notes

- The packs API is **not officially documented** — it may change without notice.
- The thatCleo/Nightlight_Pack_Downloader fork is a good reference for tracking changes.
- Don't abuse requests — NightLight is donation-funded.
