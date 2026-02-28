# CLAUDE.md — AutoParts Pro

## Overview

AutoParts Pro is a static single-page application for automotive parts catalog browsing and business management. It runs entirely in the browser with no build step — open `index.html` directly.

## File Structure

| File | Purpose |
|---|---|
| `index.html` | HTML structure only — sidebar, pages, modals, toast. Links external CSS/JS. |
| `css/style.css` | All CSS — layout, components, responsive, animations. |
| `js/config.js` | `CONFIG` object with provider URLs/hosts. `loadConfig()` reads from localStorage. Must load first. |
| `js/db.js` | IndexedDB wrapper (`openDB`, `dbPut`, `dbGet`, `dbGetAll`, `dbDelete`, `dbClear`, `dbCount`) + `cachedApiCall()` with 24h TTL. Depends on nothing. |
| `js/providers.js` | `PlateProviders` and `PartsProviders` objects with API fetch logic. Depends on `config.js`. |
| `js/charts.js` | `initDashboard()` and `initBI()` — Chart.js chart creation. Depends on `db.js`. |
| `js/app.js` | Everything else: navigation, CRUD for all entities, toast/modals, seed data, `init()`. Depends on all above. |

**Load order**: `config.js` → `db.js` → `providers.js` → `charts.js` → `app.js`

## API Providers

### Informazioni Targhe (RapidAPI)
- **Endpoint**: `https://informazioni-targhe.p.rapidapi.com/targa/{plate}`
- **Free tier**: 10 requests/day
- **Used for**: Italian license plate → vehicle data lookup

### Auto Parts Catalog (RapidAPI)
- **Endpoint**: `https://auto-parts-catalog.p.rapidapi.com/...`
- **Free tier**: 100 requests/month
- **Used for**: Manufacturers → Models → Types → Categories → Articles hierarchy
- **Endpoints**: `/manufacturers`, `/manufacturers/{id}/models`, `/models/{id}/types`, `/types/{id}/categories`, `/categories/{id}/articles`, `/articles/{id}`

### Open Labor Project
- **Website**: https://openlaborproject.com
- **Free tier**: Unlimited (no API, just reference link)
- **Used for**: Static labor time reference tables (hardcoded in HTML)

Both RapidAPI services use the same API key (header `X-RapidAPI-Key`).

## Adding a New Provider

1. **`js/config.js`**: Add entry to `CONFIG.providers` with `baseUrl` and `host`
2. **`js/providers.js`**: Add implementation to `PlateProviders` or `PartsProviders` matching the existing interface
3. **`index.html`**: Add `<option>` to the relevant settings dropdown (`settingsPlateProvider` / `settingsPartsProvider`)
4. **`js/providers.js`**: Update `getPlateProvider()` / `getPartsProvider()` selector

Provider interface for plates: `{ async lookup(plate) → object }`
Provider interface for parts: `{ async getManufacturers(), getModels(id), getTypes(id), getCategories(id), getArticles(id), getArticle(id) }`

## Free Tier Limits

- **Informazioni Targhe**: 10 plate lookups/day
- **Auto Parts Catalog**: 100 API calls/month
- **Cache**: All API responses cached 24h in IndexedDB to minimize quota usage
- Error `429` → quota exceeded toast + cache fallback

## Key Patterns

- All business data (clients, suppliers, inventory, invoices) lives in IndexedDB — no backend
- First run seeds sample data via `seedIfEmpty()`
- Navigation is SPA-style via `showPage()` which toggles `.active` class
- All functions are global (no modules) — this is intentional for simplicity
