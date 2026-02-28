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

## Pages (8 total)

| Sidebar Entry | Page ID | Description |
|---|---|---|
| Home | `page-home` | Landing with hero search, quick actions, recent searches, stats summary |
| Cerca | `page-cerca` | Unified search: plate lookup, marca/modello catalog, cross-reference |
| Magazzino | `page-magazzino` | Inventory management with infinite scroll |
| Fatturazione | `page-fatture` | Invoicing with infinite scroll |
| Anagrafiche | `page-anagrafiche` | Clients + Suppliers with tab switcher |
| Manodopera | `page-manodopera` | Labor times reference with infinite scroll |
| Analytics | `page-analytics` | Dashboard stats + charts + BI (empty state when no data) |
| Impostazioni | `page-impostazioni` | API keys, provider selection, data management (sidebar footer) |

### Sidebar Grouping
- **Operativo**: Home, Cerca, Magazzino, Fatturazione
- **Gestione**: Anagrafiche, Manodopera, Analytics
- **Footer**: Impostazioni (separated at bottom)

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

### Plate Providers (3 options, selectable in Impostazioni)

#### Informazioni Targhe (RapidAPI) — insurance data only
- **Endpoint**: `https://informazioni-targhe.p.rapidapi.com` (async job API: submit → poll → retrieve)
- **Auth**: `X-RapidAPI-Key` header (shared RapidAPI key)
- **Free tier**: 10 requests/day
- **Returns**: Insurance status, company, policy number, theft status — NO CarMake/CarModel
- **Vehicle card**: Shows insurance card + manual marca/modello dropdowns for parts search

#### Zyla (Italy License Plate Lookup) — full vehicle data
- **Endpoint**: `https://zylalabs.com/api/352/italy+license+plate+lookup+api/458/license+plate+lookup?plate={targa}`
- **Auth**: `Authorization: Bearer {zylaApiKey}` (separate key from RapidAPI)
- **Returns**: CarMake, CarModel, Version, RegistrationYear, EngineSize, FuelType, ABS, AirBag
- **Vehicle card**: Rich specs grid + "Cerca Ricambi per [Make] [Model]" auto-catalog button

#### CarRegistrationAPI — full vehicle data
- **Endpoint**: `https://www.regcheck.org.uk/api/reg.asmx/CheckItaly?RegistrationNumber={targa}&username={username}`
- **Auth**: `username` query param (from carregistrationapi.com)
- **Returns**: XML wrapping JSON with same fields as Zyla
- **Vehicle card**: Same rich specs grid + auto-catalog button

### Auto Parts Catalog (RapidAPI)
- **Endpoint**: `https://auto-parts-catalog.p.rapidapi.com/...`
- **Free tier**: 100 requests/month
- **Used for**: Manufacturers → Models → Types → Categories → Articles hierarchy

### Open Labor Project
- **Website**: https://openlaborproject.com
- **Free tier**: Unlimited (static data hardcoded in `labor.js`)

RapidAPI services (Informazioni Targhe + Auto Parts Catalog) share the same API key. Zyla and CarRegistrationAPI use separate credentials.

### Auto-Catalog Linking

When a plate provider returns CarMake/CarModel (Zyla or CarRegistrationAPI), the vehicle result card shows a "Cerca Ricambi" button that calls `autoNavigateCatalogByMake(make, model)`. This fuzzy-matches the manufacturer in the catalog, navigates to it, then tries to match the model too.

## Adding a New Provider

1. **`js/config.js`**: Add entry to `CONFIG.providers` with `baseUrl` and `host`
2. **`js/providers.js`**: Add implementation to `PlateProviders` or `PartsProviders`
3. **`index.html`**: Add `<option>` to the relevant settings dropdown
4. **`js/providers.js`**: Update `getPlateProvider()` / `getPartsProvider()` selector

## Free Tier Limits

- **Informazioni Targhe**: 10 plate lookups/day (RapidAPI key)
- **Zyla**: Depends on plan (separate Zyla API key)
- **CarRegistrationAPI**: Depends on plan (username from carregistrationapi.com)
- **Auto Parts Catalog**: 100 API calls/month (RapidAPI key)
- **Cache**: All API responses cached 24h in IndexedDB to minimize quota usage
- Error `429` → quota exceeded toast + cache fallback

## Key Patterns

- All business data (clients, suppliers, inventory, invoices) lives in IndexedDB — no backend
- Navigation is SPA-style via `showPage()` with backward-compatible page name mapping
- All functions are global (no modules) — this is intentional for simplicity
- InfiniteScroll instances are tracked globally and destroyed/recreated on page navigation
- Anagrafiche uses tab switching (`switchAnagTab`) with shared search input
- Cerca page uses tab switching (`switchCercaTab`) with section toggling for vehicle/catalog/crossref results
