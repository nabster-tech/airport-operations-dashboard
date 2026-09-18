# Implementation decisions

## Catalog and navigation

The catalog is the application's source of truth for 71 stable KPI IDs, exact requirement names, descriptions, categories, supported filters, units, and view families. Categories own their routes, layouts, filters, exports, and loading state. Hash routes keep the static build deployable without server rewrite rules while still supporting reload and browser history.

Global search uses the same catalog and opens a KPI in the correct category. Unknown category routes recover to Airside Operations instead of leaving an empty workspace.

## Data and calculation boundary

Static fixture families model related flights, resources, stands, safety events, weather observations, passenger flows, and operational exercises. A category source resolves filters, calculates observations, and creates chart, matrix, event, report, or scenario view models. Requests accept an `AbortSignal`, and TanStack Query keys include category, filter, and definition version.

Each KPI specification carries a provisional formula, source, target, caveat, and version. Rates derive from numerator and denominator records, weighted measures retain their sample count, and unavailable values remain distinct from zero. The UI exposes these details in every focus dialog.

The source contract can be implemented by an HTTP adapter without changing category cards. Production responses must be schema-validated and reconciled against source-system totals before release.

## Interaction and layout

React Grid Layout handles pointer movement, compaction, and resizing. Cards expose east, south, and southeast resize cursors as well as menu actions for standard width, full width, order, and height. A measured container selects responsive desktop, tablet, and mobile layouts; charts fill bounded content regions using `ResponsiveContainer`.

Each category has an independent draft and saved layout. Save validates and atomically writes the versioned document to localStorage. Cancel restores the saved document. Invalid storage recovers to defaults with a visible message. A conservative migration maps only the compatible OTP, turnaround, runway, and security-wait preferences from the original dashboard format.

Radix dialogs and menus provide focus and keyboard behavior. Mobile navigation traps focus correctly. Every chart has an actual HTML detail table, and status is communicated with text as well as color.

## Production evolution

1. Approve KPI definitions, owners, dimensions, thresholds, time zones, and late-event rules with airport operations teams.
2. Implement read-only aggregate APIs behind the category-source interface, including timestamps, lineage, partial errors, and reconciliation fields.
3. Add organization SSO and server-enforced airport, role, and revenue permissions. Move preferences to a revision-aware user API.
4. Define freshness and service objectives for each source. Add last-known values, retry and recovery behavior, source-health monitoring, and operational alert ownership.
5. Validate performance against representative history and concurrency. Introduce polling first; use streaming only where the agreed latency requires it, with cursor replay and gap recovery.
6. Complete staging, security, accessibility, browser, disaster-recovery, and operational-acceptance gates before production release.

The PoC implements the complete static user experience and replaceable application contracts. It does not claim live integration or operational certification.

Currency display preferences support EUR, USD, and INR from an INR reference using fixed illustrative PoC rates (1 INR = 0.011 EUR, 0.012 USD). They are applied only to metrics whose declared unit is a currency. The current 71-entry operations catalog contains no monetary KPI, so no operational values are scaled. Production must source approved FX rates and expose their effective timestamp before enabling monetary conversions.
Airport timeline labels use Asia/Kolkata local time. The optional UTC view shows the paired UTC time on chart axes, detail rows, and snapshot labels; airport and UTC preferences are saved in browser-local presentation settings.
