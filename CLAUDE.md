# CLAUDE.md — AutoParts Pro

## Overview

AutoParts Pro is a static single-page application for automotive parts catalog browsing and business management. It runs entirely in the browser with no build step — open `index.html` directly.

## File Structure

| File | Purpose |
|---|---|
| `index.html` | HTML structure — sidebar, pages, modals, toast. Links external CSS/JS. |
| `css/style.css` | All CSS — layout, components, responsive, animations, global search dropdown, infinite scroll. |
| `js/config.js` | `CONFIG` object with provider URLs/hosts. `loadConfig()` reads from localStorage. Must load first. |
| `js/db.js` | IndexedDB wrapper (`openDB`, `dbPut`, `dbGet`, `dbGetAll`, `dbDelete`, `dbClear`, `dbCount`) + `cachedApiCall()` with 24h TTL. Depends on nothing. |
| `js/providers.js` | `PlateProviders` and `PartsProviders` objects with API fetch logic. Depends on `config.js`. |
| `js/pagination.js` | `InfiniteScroll` class — reusable infinite scroll with IntersectionObserver. Depends on nothing. |
| `js/charts.js` | `initAnalytics()` — Chart.js charts for the unified Analytics page. Depends on `db.js`. |
| `js/labor.js` | `LABOR_TIMES` data + `renderLaborPage()` with InfiniteScroll. Depends on `pagination.js`. |
| `js/app.js` | Everything else: navigation, CRUD, modals, global search, autocomplete, `init()`. Depends on all above. |

**Load order**: `config.js` → `db.js` → `providers.js` → `pagination.js` → `charts.js` → `labor.js` → `app.js`

## Pages (7 total)

| Sidebar Entry | Page ID | Description |
|---|---|---|
| Cerca | `page-cerca` | Unified search: plate lookup, marca/modello catalog browsing, cross-reference (merged from ricerca + catalogo + crossref) |
| Manodopera | `page-manodopera` | Labor times reference with infinite scroll |
| Analytics | `page-analytics` | Dashboard stats + charts + BI detailed analysis (merged from dashboard + BI) |
| Magazzino | `page-magazzino` | Inventory management with infinite scroll on tables |
| Anagrafiche | `page-anagrafiche` | Clients + Suppliers with tab switcher (merged from clienti + fornitori) |
| Fatturazione | `page-fatture` | Invoicing with infinite scroll |
| Impostazioni | `page-impostazioni` | API keys, provider selection, data management |

## Infinite Scroll

`InfiniteScroll(container, fetchBatch, options)` class in `js/pagination.js`:
- Uses `IntersectionObserver` on a sentinel element
- `fetchBatch(offset, limit)` returns items array
- `renderItem(item)` returns HTML string per item
- `pageSize` default 30 (labor uses 2 category groups per batch)
- Applied to: inventory table, movements table, clients table, suppliers table, invoices table, labor times, catalog grids

## Enhanced Global Search

The topbar search (`#globalSearch`) uses the `GlobalSearch` class:
- Dropdown with results grouped by type: Veicoli, Magazzino, Clienti, Fornitori, Fatture
- Keyboard navigation (arrows + enter)
- Enter with Italian plate format (AA123BB) auto-triggers plate search
- Selecting a result navigates to the correct page with filtering applied

## API Providers

### Informazioni Targhe (RapidAPI)
- **Endpoint**: `https://informazioni-targhe.p.rapidapi.com/targa/{plate}`
- **Free tier**: 10 requests/day
- **Used for**: Italian license plate → vehicle data lookup

### Auto Parts Catalog (RapidAPI)
- **Endpoint**: `https://auto-parts-catalog.p.rapidapi.com/...`
- **Free tier**: 100 requests/month
- **Used for**: Manufacturers → Models → Types → Categories → Articles hierarchy

### Open Labor Project
- **Website**: https://openlaborproject.com
- **Free tier**: Unlimited (static data hardcoded in `labor.js`)

Both RapidAPI services use the same API key (header `X-RapidAPI-Key`).

## Adding a New Provider

1. **`js/config.js`**: Add entry to `CONFIG.providers` with `baseUrl` and `host`
2. **`js/providers.js`**: Add implementation to `PlateProviders` or `PartsProviders`
3. **`index.html`**: Add `<option>` to the relevant settings dropdown
4. **`js/providers.js`**: Update `getPlateProvider()` / `getPartsProvider()` selector

## Free Tier Limits

- **Informazioni Targhe**: 10 plate lookups/day
- **Auto Parts Catalog**: 100 API calls/month
- **Cache**: All API responses cached 24h in IndexedDB to minimize quota usage
- Error `429` → quota exceeded toast + cache fallback

## Key Patterns

- All business data (clients, suppliers, inventory, invoices) lives in IndexedDB — no backend
- Navigation is SPA-style via `showPage()` with backward-compatible page name mapping
- All functions are global (no modules) — this is intentional for simplicity
- InfiniteScroll instances are tracked globally and destroyed/recreated on page navigation
- Anagrafiche uses tab switching (`switchAnagTab`) with shared search input
- Cerca page uses tab switching (`switchCercaTab`) with section toggling for vehicle/catalog/crossref results
