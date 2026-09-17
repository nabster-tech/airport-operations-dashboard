# Airport Operations Analytics: refined planning prompt

Use this prompt to commission a detailed implementation plan. It deliberately separates a demonstrable PoC from the work required for production deployment.

---

Act as a Principal Frontend Engineer, product designer, and technical architect. Produce an actionable implementation plan for an Airport Operations Analytics Dashboard that can first be demonstrated as a functional proof of concept and then developed into a production application.

The primary users are airport duty managers and terminal operations supervisors. The product must help them identify congestion and delays, inspect contributing factors, and customize their monitoring workspace.

First verify technology choices against current official documentation. Explain significant tradeoffs, distinguish verified capabilities from assumptions, and identify a small compatibility spike before committing to exact dependency versions. Do not generate application code in this planning response.

## 1. Delivery goal and boundaries

Plan a complete PoC with all 13 KPIs below, realistic static sample data, working filters, draggable/resizable cards, focus mode, and durable local layout preferences. Provide a clear implementation sequence, acceptance criteria, demonstration script, effort estimate with assumptions, and a separate production roadmap.

Assume one fictional airport with Terminal 1, Terminal 2, and an International Terminal. Make airport name, IANA timezone, currency, capacities, and KPI thresholds configurable. Assume desktop operations use is primary, with usable tablet and mobile views. The International Terminal is a location; it is not a substitute for a domestic/international flight classification.

The PoC must run without external services after installation and build. Label it “Static demo data” and show the dataset's fixed as-of time. Do not implement telemetry simulation, timers, polling, streaming, or a backend for the PoC. Production integrations, identity, authorization, shared dashboards, and operational support are later delivery gates. Establish interfaces for these additions without implementing speculative infrastructure.

## 2. Technology decisions

Evaluate this preferred stack and justify any change:

- React 19, strict TypeScript, Vite, and a supported Node.js LTS release.
- Tailwind CSS 4 with its Vite plugin; semantic CSS design tokens; Lucide React icons; locally hosted Inter.
- React Grid Layout 2 using its current typed API, isolated behind a dashboard layout adapter.
- Recharts 3 for bounded, aggregated chart series; HTML/CSS for queue status cards and the gate matrix.
- Radix primitives for dialogs, menus, tooltips, and focus management.
- Zustand for dashboard preferences and layout editing; TanStack Query for asynchronous telemetry and detail data; Zod for runtime validation at storage and API boundaries.
- Vitest, React Testing Library, and Playwright with axe for tests appropriate to the risks.

Select one chart library and one grid engine. Compare Recharts with Chart.js and compare React Grid Layout with a custom layout implementation. Explain the operational benefit of each dependency. Verify peer dependencies and APIs in a small install/build/browser spike, then pin tested versions and commit a lockfile. Avoid assuming that independently current packages form a tested stack.

## 3. Dashboard interaction contract

Use one scrollable overview containing all 13 cards and category navigation that scrolls to groups. Global data filters must never remove cards from saved layouts.

Provide normal viewing and explicit layout-editing modes. In editing mode, every card supports a dedicated drag handle, resize handle, per-card minimum dimensions, and bounded collision handling. Provide keyboard-accessible reorder actions and size presets. On narrow screens use one column, preserve desktop coordinates, and offer reorder/height presets instead of awkward freeform dragging.

Provide Save layout, Cancel changes, Reset layout, Hide card, Undo hide, and Restore cards. Settings must expose meaningful options such as chart/table display, density, or an applicable breakdown. A hidden card remains available for restoration. No dead controls.

Define “Main Frame” as an accessible focus overlay: opening a card displays a larger chart, an accessible data table, relevant breakdowns, the KPI definition, thresholds, freshness, and current filter scope. Keep grid coordinates, scroll position, settings, and filters intact. Closing with Escape or the close button restores focus to the originating control. Use subtle transitions and respect reduced-motion preferences.

The focus view and the card must use the same data source/cache and consistent sample records. Keep future fetching and subscription logic outside visual components.

Persist a versioned, validated layout document per airport and breakpoint in localStorage. Persist preferences only. Recover safely from corrupt data, schema changes, unavailable storage, and unknown widget IDs. A failed save must not falsely report success.

## 4. Charts and resizing

Charts must fill their measured content region, excluding card headers and controls. Set explicit parent height and `min-width: 0` / `min-height: 0` where needed.

Use Recharts ResponsiveContainer as the chart measurement owner. It already uses ResizeObserver; do not add a second observer merely to force rerenders. Profile a small resize debounce and turn off expensive series animation while resizing. Do not remount charts on every size change. Use container queries for compact presentation and bounded series lengths for predictable rendering.

## 5. KPI definitions and presentation

Define the formula, units, aggregation window, supported filters, target/threshold, empty behavior, detail breakdown, and likely production source for each KPI. Proposed PoC formulas are demo assumptions to validate with airport stakeholders.

1. Passenger throughput: processed passenger movements over time versus a matching forecast. Show daily progress separately from interval counts. Line chart.
2. Security wait: checkpoint mean wait in minutes, sample count, and optional p95 in focus mode. Green below 10 minutes, amber from 10 through 20, red above 20. Horizontal bars.
3. Check-in queue density: current queued passengers relative to configured queue capacity for each terminal. Status cards with counts and utilization.
4. Baggage delivery: elapsed minutes from first to last bag for completed flight/belt deliveries. Distinguish this from arrival-to-first-bag time. Horizontal bars with an explicit target.
5. On-time performance: percentage of eligible completed arrivals/departures within the configured delay tolerance; use 15 minutes as a stated demo assumption. Define event timestamps, cancellations, missing records, and denominators. Donut plus counts.
6. Flight status: arrivals and departures are directions; delayed and cancelled are statuses. Use separate arrival/departure stacked bars with mutually exclusive status buckets to prevent double counting.
7. Runway utilization: occupied seconds divided by available seconds in the selected window. Show allocated slots used as a separately labeled measure. Area chart and current runway status.
8. Aircraft turnaround: minutes from on-block to off-block for completed turns, grouped by airline and aircraft type. Horizontal bars.
9. Baggage mishandling: recorded lost/delayed bag incidents per 1,000 passenger movements under the agreed denominator. Trend line with source lag and reporting-window labels.
10. Cargo throughput: tonnes processed against a comparable target. Metric and progress bar.
11. Parking occupancy: occupied spaces divided by open capacity per garage. Radial bars plus explicit counts and percentages.
12. Retail and dining revenue: net sales under a documented tax/refund policy, in one configured currency. Metrics and sparklines.
13. Gate availability: free, occupied, reserved, and unavailable gates, with a reconciled total. Accessible matrix and tabular alternative.

## 6. Filtering and telemetry semantics

Global filters: Last hour, Last 6 hours, Today; All terminals, T1, T2, International; All movements, Arrivals, Departures. Use “Movement” as the visible label to remove ambiguity around “Flight type.”

Specify a filter applicability matrix. For example, runway occupancy is airport-wide, and parking/revenue do not have an arrival/departure dimension. Show scope labels when filters do not apply. Incompatible combinations must produce an explicit not-applicable state rather than invented data.

Flow metrics aggregate the selected window. Snapshot metrics show the latest sample at its endpoint. Store timestamps in UTC; display airport-local time and use the airport timezone for Today. Rates and averages must be recomputed from underlying numerators, denominators, and sample counts. Zero denominators display unavailable, not zero percent.

Use a bundled static dataset with a fixed reference date/time, at least 24 hours of history, terminal and movement dimensions, and detail records. Resolve relative time filters against that reference time so the demo still works on a later date. Use one curated dataset that contains an obvious Terminal 2 congestion issue for demonstration; no scenario engine is required.

Keep the dataset coherent: capacities bound occupancy, flight buckets reconcile, and detail tables agree with card totals. A small asynchronous data-source interface must supply snapshots and details. Implement only a static adapter now; production can add an HTTP adapter without changing cards. No API adapter stub or unimplemented control is needed in the PoC.

Include mode, as-of time, and optional quality metadata in the contract. Provide useful empty/error UI and test fixtures, but defer automatic freshness monitoring, source outages, retries, and real-time updates to integration work. A static dataset must not be presented as a failing live feed.

## 7. Architecture and design

Use a widget registry with stable IDs, typed data contracts, supported filters, default/minimum dimensions, renderers, and detail renderers. Keep telemetry transport, aggregation, layout persistence, and visual rendering separate.

Retain these named responsibilities: `types.ts`, `mockData.ts` for fixed sample data, `KPICard.tsx`, `DashboardGrid.tsx`, and `App.tsx`. Expand into cohesive modules rather than forcing the entire application into five files.

Use slate backgrounds, restrained blue accents, green/amber/red status tokens, strong text contrast, tabular numbers, visible focus indicators, and clear unit labels. Convey state through text/icons as well as color. Keep detailed tables in focus mode so overview cards remain readable.

## 8. Acceptance and production path

Define executable acceptance scenarios for drag/resize, saved layout restoration, cancelling edits, hiding/restoring cards, focus-state preservation, filter correctness, fixture consistency, fixed-date time windows, keyboard use, and mobile adaptation.

Set measurable interaction performance targets against a named reference machine, browser, viewport, dataset, and network profile. Check repeated resize/focus operations for errors and observer leaks. Defer live-feed soak and load testing to the production integration milestone. Treat targets as acceptance goals requiring measurement, not claimed results.

Describe production evolution through a read-only pilot and a hardened release: backend data aggregation, source reconciliation, snapshot/stream consistency, authentication, server-enforced permissions, centrally stored preferences, monitoring, delivery pipelines, recovery, and support ownership. State what remains undecided until data volumes, source systems, freshness needs, and hosting constraints are known.

Deliver: assumptions and decisions; verified technology choices with official links; KPI/filter contracts; architecture and directory structure; sequenced milestones with dependencies, effort ranges, and exit criteria; test strategy; five-minute demo script; and production readiness gates. List unresolved business decisions without blocking the plan on information that can reasonably be assumed for a PoC.
