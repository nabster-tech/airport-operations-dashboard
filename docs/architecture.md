# Implementation decisions

## Data and state ownership

A single static adapter supplies the snapshot and focused detail queries. TanStack Query caches these asynchronous reads with retries, background refetch, and polling disabled. The adapter accepts an AbortSignal and can be replaced with an HTTP implementation without changing card renderers. Filters are validated at the adapter boundary. A production HTTP adapter must additionally validate its external response payloads.

Zustand owns saved preferences and the current edit draft. Telemetry is not persisted. Widget IDs and payloads are linked by a TypeScript map. Cards render a discriminated visualization payload and never import raw fixtures.

## Metrics

Time windows are resolved against the fixture timestamp, with Today starting at airport-local midnight. Flow measures aggregate their window; occupancy and availability use the endpoint snapshot. Means use sample weights. Rates are recomputed from counts. Unknown and zero values remain distinct.

Arrival/departure directions are separate from flight status. OTP excludes cancelled, pending and missing-actual movements. Baggage delivery measures first-to-last bag, not arrival-to-first bag. Runway occupancy merges overlapping intervals before dividing by available runway time. Mishandling is explicitly a reporting-window proxy.

The p95 detail is labeled **highest interval p95** because sample-level observations are not provided; it is not an aggregate percentile. All definitions, units, target assumptions and sources are visible in focus dialogs.

## Interaction and layout

React Grid Layout 2 handles pointers, compaction and resize constraints. A measured container determines desktop/tablet/mobile layouts. Each breakpoint has independent saved coordinates. Every card has a readable minimum size. Mobile uses one column and menu-based move/size actions.

Save validates and writes a draft atomically to localStorage. Cancel restores the prior document. Unknown stored IDs are removed, missing registry widgets are appended, v0 is migrated, and invalid documents recover to defaults with a message. Storage failure leaves the draft available and never reports a successful save.

Radix dialogs and menus provide focus behavior. The mobile sidebar prevents focus from reaching hidden/background content and supports Escape and a Tab loop. Chart values are available in actual HTML tables. Color always has a label or count alongside it.

Recharts ResponsiveContainer is the chart's only size observer. Parent content areas have bounded height and shrinkable flex dimensions. Series animations are disabled during normal chart rendering to keep resizing and frequent focus changes predictable.

## Production evolution

1. Replace the static adapter with read-only aggregated source APIs. Reconcile identifiers, timezones, formula versions, late events and source totals with operations owners.
2. Add organization SSO and server-enforced role/airport permissions. Keep revenue access separately controllable. Move preferences to a revision-aware user API.
3. Define expected freshness for each source; provide source timestamps, partial failure, last-known values, retry and recovery. Use polling first when adequate; add SSE only when justified.
4. For streaming, define cursors, event IDs, gap detection, replay, reconnect and snapshot resynchronization. Add a live-update soak test.
5. Agree load, retention, recovery and service objectives before selecting specialized data infrastructure. Add monitoring, source-health alerts, staging, rollback, backup restoration and operational ownership.

This PoC implements the UI and static data contracts. It does not claim production source integration or operational certification.
