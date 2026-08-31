# WalangBrownout IMS — frontend

A working React + Vite inventory app for WalangBrownout Appliances:
a dashboard, a searchable/filterable inventory table with an item detail view, a batch
list in FEFO order, and an alert center you can resolve alerts from. No backend is
wired up yet. Everything runs on in-memory mock data. but every read and write goes
through one API service layer so a real backend can be dropped in later without
touching any page.

## Run it

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Production build: `npm run build` (outputs to `dist/`).

## Pages / routes

| Route         | What it does                                                        |
|---------------|----------------------------------------------------------------------|
| `/`           | Dashboard  KPIs, items below reorder point, open alerts            |
| `/inventory`  | Full item table  search, filter by category/status, click a row for batch detail, "Add item" |
| `/batches`    | All batches across every item, FEFO sorted, filterable by status    |
| `/alerts`     | Alert center filter by tier, mark alerts resolved                 |

## Connecting a real API

Every page reads/writes through `src/services/api.js` never mock data or `fetch()`
directly from a component. That's the seam:

1. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL`.
2. In `src/services/api.js`, set `const USE_MOCK = false;`.
3. Each exported function (`getItems`, `createItem`, `getBatches`, `getAlerts`,
   `resolveAlert`, `getDashboardSummary`) already has the real `fetch`/`POST`/`PATCH`
   call written.

## How state flows

`src/context/InventoryContext.jsx` loads items/batches/alerts once on startup and
shares them across pages (so resolving an alert on `/alerts` updates the badge count
in the navbar immediately). Pages never call the API directly they call
`useInventory()`.

## Structure

```
src/
  components/   Navbar, Footer, Badges, Modal
  context/      InventoryContext.jsx — shared app state
  pages/        Dashboard, Inventory, Batches, AlertsCenter, NotFound
  services/     api.js — the only place that talks to a backend
  data/         mockData.js — placeholder data shaped like real API responses
  styles/       index.css — design tokens + all styling (no CSS framework)
```
