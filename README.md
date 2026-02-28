# AutoParts Pro — Catalogo & Gestionale

A single-page web application for automotive parts catalog and business management. Works as a **static site** — just open `index.html` in a browser. No build tools required.

## Features

- **Vehicle Lookup** — Search Italian plates via Informazioni Targhe API
- **Parts Catalog** — Browse manufacturers → models → versions → categories → parts via Auto Parts Catalog API
- **Cross-Reference** — Find aftermarket equivalents by OEM code (searches local cache)
- **Labor Times** — Reference repair times from Open Labor Project
- **Inventory Management** — Track stock, movements, min quantities (IndexedDB)
- **Clients & Suppliers** — CRM with CRUD operations (IndexedDB)
- **Invoicing** — Create/view/manage invoices with IVA calculation
- **Dashboard & BI** — Chart.js charts for revenue, categories, margins

## Setup

1. Open `index.html` in a browser
2. Go to **Impostazioni** (Settings)
3. Paste your [RapidAPI](https://rapidapi.com) key
4. Click **Salva** → **Test Connessione**

### API Providers

| Provider | Used For | Free Tier |
|---|---|---|
| [Informazioni Targhe](https://rapidapi.com/alessandrocesarini/api/informazioni-targhe) | Plate lookup | 10 requests/day |
| [Auto Parts Catalog](https://rapidapi.com/auto-parts-catalog/api/auto-parts-catalog) | Parts catalog | 100 requests/month |
| [Open Labor Project](https://openlaborproject.com) | Labor times | Free, no key needed |

All API responses are cached in IndexedDB for 24 hours to save quota.

### Swapping Providers

The app uses a provider abstraction layer (`js/providers.js`). To add a new plate or parts provider:

1. Add the provider config to `CONFIG.providers` in `js/config.js`
2. Implement the provider interface in `js/providers.js` (see `PlateProviders` / `PartsProviders`)
3. Add the option to the settings dropdowns in `index.html`
4. Update `getPlateProvider()` / `getPartsProvider()` if needed

## Project Structure

```
index.html          — HTML structure, links to CSS/JS
css/style.css       — All styles
js/config.js        — CONFIG object and provider endpoints
js/db.js            — IndexedDB wrapper and API cache
js/providers.js     — API provider implementations
js/charts.js        — Chart.js dashboard and BI charts
js/app.js           — Main app logic, navigation, UI rendering
README.md           — This file
CLAUDE.md           — AI coding assistant context
```

## Data Storage

All data is stored locally in the browser via **IndexedDB** (`AutoPartsPro` database). No server required. Stores: `apiCache`, `vehicles`, `clients`, `suppliers`, `inventory`, `movements`, `invoices`, `orders`.

Settings (API key, provider choices) are stored in `localStorage`.
