# Airside · Airport operations

A React and TypeScript proof of concept for an airport operations analytics workspace. It implements all **71 requested KPIs** across **11 operational categories** using a coherent static dataset fixed to **17 September 2026, 14:00 IST**. The data boundary is asynchronous and replaceable, so production APIs can be introduced without rewriting the category views.

## Run locally

Use Node.js 24 LTS and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, normally <http://127.0.0.1:5173>.

```sh
npm run build
npm run preview
```

The production build is emitted to `dist/`. Runtime data, fonts, and icons are bundled; only the initial dependency installation needs network access.

## What works

- Light, Dark, and System appearance options in the top bar. Preferences persist across visits and synchronize between tabs; System follows OS appearance changes.
- EUR, USD, and INR display-currency selection with fixed illustrative conversion rates for monetary KPIs; the current 71 operating KPIs have no monetary unit, so their values stay in their original units.
- A saved airport local-time / UTC control shows both zones in timeline axes, detail tables, and snapshot timestamps.

- All 71 KPIs from the supplied requirements, grouped into Airside Operations, Turnaround Management, Runway Operations, Apron Operations, Airside Safety, Ground Support / Resources, Weather / LVP, Operational Efficiency, Reporting & Analytics, Terminal Operations, and Passenger Flow.
- Category routes that survive reload and browser history, plus global KPI search that opens any metric in its category.
- Category-specific time, terminal, movement, carrier, runway, resource, and granularity filters.
- Drag-to-rearrange layout editing with edge and corner resize cursors, keyboard move/size actions, full-width sizing, Save/Cancel/Reset, and Hide/Undo/Restore.
- Independent, versioned layouts and filter memory for every category, including compatible migration from the original four KPI preferences.
- Focus dialogs for every KPI with calculation, source, target, caveat, trend or event detail, and an accessible HTML data table.
- CSV export for a category or focused KPI, responsive mobile navigation, and explicit zero/unavailable states.
- A precomputed passenger-flow scenario that is clearly presented as read-only demonstration output.

The PoC intentionally uses static data and provisional KPI definitions. The source timestamp and demo status remain visible in the interface. The exact requirements archive and delivery plan are in [`docs/planning`](docs/planning).

## Five-minute demonstration

1. Move between KPI categories in the sidebar and use browser Back/Forward to show route persistence.
2. Search for a KPI such as **Security Queue Wait Time**, open it, and inspect its definition, source, and detail table.
3. Open **Edit layout**, drag a card, resize it from an edge or corner, set another card to full width, and save.
4. Reload to show the saved category layout, then switch categories to show independent layouts.
5. Apply category filters, export CSV, and open **Passenger Flow** to inspect the precomputed desk-allocation scenario.

## Verify

```sh
npm run check
npx playwright install chromium
npm run test:e2e
npm run format:check
```

Browser tests start a production preview on port 4173. Screenshots are generated under `screenshots/`; failure traces are written to `test-results/`. See the [verification record](docs/verification.md).

## Structure and production boundary

- `src/categories/catalog.ts`: the typed 71-KPI catalog and category metadata.
- `src/categories/models.ts`: filters, metric specifications, observations, queries, and view models.
- `src/categories/fixtures.ts`: deterministic, related airport records used by the PoC.
- `src/categories/source.ts`: cancellable query adapter and versioned KPI calculations.
- `src/categories/workspace.ts`: category layout, filter persistence, validation, and migration.
- `src/categories/views.tsx`: shared visualization and focus-detail families.
- `src/categories/CategoryGrid.tsx`: draggable, resizable category workspace.
- `src/categories/CategoryApp.tsx`: routing, navigation, search, filters, exports, and focus orchestration.
- `docs/planning/KPI_REQUIREMENTS.tsv`: unchanged requirements archive.
- `docs/planning/KPI_CATEGORY_IMPLEMENTATION_PLAN.md`: implementation and production evolution plan.

Production can add an HTTP adapter behind the existing source interface and a revision-aware server preferences repository. Formula ownership, source reconciliation, freshness, identity, permissions, observability, and operational certification remain production integration work.

Dependency versions are pinned in `package.json` and `package-lock.json`.
