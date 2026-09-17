# Airside · Airport operations

A complete React/TypeScript proof of concept for an airport duty manager's workspace. All 13 KPIs use a coherent **static demo dataset**, fixed to **17 September 2026, 14:00 IST**. Time filters are anchored to that snapshot, so the demonstration works on any date.

## Run locally

Use Node.js 24 LTS and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173).

```sh
npm run build
npm run preview
```

The production build is in `dist/`. Serve it over HTTP using any static host. Runtime data, fonts, and icons are bundled; the app does not need an external API. A first installation needs npm access.

## What works

- Passenger throughput, security waits, check-in density, baggage delivery, OTP, flight status, runway utilization, turnaround time, baggage mishandling, cargo throughput, parking, concession revenue, and gate availability.
- Terminal, movement, and time-window filters, with explicit labels for airport-wide measures and incompatible selections.
- Edit mode: pointer drag/resize, keyboard-accessible move and size actions, Save/Cancel/Reset, Hide/Undo/Restore.
- Versioned browser-local preferences, corrupt-storage recovery, and truthful save failure messages.
- Focus dialogs with expanded charts, definitions, source labels, detail tables, and applicable breakdowns.
- Chart/table and density preferences; responsive desktop/tablet/mobile layouts; mobile navigation keyboard support.
- A selectable gate matrix and CSV export of the filtered snapshot.

On phones, use card menus to reorder cards and choose their height. Desktop coordinates remain independent. “Today” refers to the fixture date; there is no live-update indicator or background telemetry timer.

## Five-minute demonstration

1. Open Overview and identify the Terminal 2 congestion notice.
2. Select **View details** to inspect T2 departure security; compare checkpoints and switch to the Terminal breakdown.
3. Close focus, then reset filters. Open **Edit layout**, drag a card, resize a corner, and use a card menu to move it with the keyboard.
4. Hide/undo/restore a card, save, and refresh. Open a card's data-table display.
5. Try Last hour and a terminal filter, inspect the runway's airport-wide label, then resize to a phone viewport.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run format:check
```

Browser tests start a production build and preview server on port 4173. Screenshots are generated under `screenshots/`; failure traces are under `test-results/`. See [verification notes](docs/verification.md).

## Structure and production boundary

- `src/types.ts`: typed KPI payload map, filters, fixture and layout contracts.
- `src/mockData.ts`: deterministic fixture recipe, independent of wall-clock time.
- `src/data/TelemetrySource.ts`: cancellable async snapshot/detail interface.
- `src/data/StaticTelemetrySource.ts`: the implemented static adapter.
- `src/data/selectors.ts`: tested formulas, filtering, timezone and occupancy calculations.
- `src/widgetRegistry.ts`: widget definitions, sizing and display metadata.
- `src/layout/`: schema validation, browser storage, draft editing, responsive positions.
- `src/components/`: KPICard, DashboardGrid, FocusDialog, chart and table renderers.
- `src/App.tsx`: sidebar, filters, actions and the application shell.

Production can add an HTTP adapter at the source boundary and a server-backed preferences repository. The charts do not import fixture records. The KPI formulas and source mappings need airport-owner approval. Actual integration, identity, server-enforced permissions, source freshness, monitoring, and recovery remain production work; see [architecture decisions](docs/architecture.md).

The exact tested dependency versions are pinned in `package.json` and `package-lock.json`.
