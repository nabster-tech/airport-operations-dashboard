# KPI categories implementation plan

Prepared: 18 September 2026. Source: `airport-operations-planning/kpi_list`, archived unchanged as [KPI_REQUIREMENTS.tsv](KPI_REQUIREMENTS.tsv).

This plan supersedes the original 13-card scope and four navigation groups wherever they conflict. It specifies the next implementation; it does not change the running application. The requirement list contains **71 entries in 11 categories**. Every entry is included below. Some entries represent reports or composite views rather than a single scalar metric.

## 1. Intended result

Replace the sidebar's **WORKSPACE** section with **KPI CATEGORIES**. Each category opens a dedicated dashboard with its own title, KPI cards, details, relevant filters, and saved layout. Clicking a category must change the displayed content, not just scroll the current dashboard.

Use the supplied category names and order exactly. Default to Airside Operations on first visit. A separate all-KPI overview is outside this change; it should not compete with the requested categories. Search across the catalog can take users directly to a category and focus a matching KPI.

| Category                   | Stable category ID       | Requirements |
| -------------------------- | ------------------------ | -----------: |
| Airside Operations         | airside-operations       |            9 |
| Turnaround Management      | turnaround-management    |            6 |
| Runway Operations          | runway-operations        |            6 |
| Apron Operations           | apron-operations         |            9 |
| Airside Safety             | airside-safety           |            8 |
| Ground Support / Resources | ground-support-resources |            6 |
| Weather / LVP              | weather-lvp              |            7 |
| Operational Efficiency     | operational-efficiency   |            5 |
| Reporting & Analytics      | reporting-analytics      |            3 |
| Terminal Operations        | terminal-operations      |            5 |
| Passenger Flow             | passenger-flow           |            7 |
| **Total**                  |                          |       **71** |

Keep static, deterministic demonstration data. All views use the same fixed airport timestamp. No simulated live telemetry, production backend, or predictive model is required for this PoC.

## 2. Current implementation findings

- `src/App.tsx` stores a selected category, but `navigate()` only finds the first matching card in the desktop layout and calls `scrollIntoView()`. Category selection never reaches `DashboardGrid` or the data query. It can produce no visible action if matching cards are hidden and uses desktop positions even on mobile.
- `src/widgetRegistry.ts` has 13 definitions in four categories. `src/types.ts` fixes those categories and widget IDs in unions.
- `DashboardGrid.tsx` renders all visible widgets from one shared saved layout. `layoutStore.ts` has one document and one edit draft.
- `useTelemetry.ts` caches by filters, not category. `TelemetrySource` returns a snapshot tied to the existing widget model.
- Sidebar counts, the overview count, heading, breadcrumb, security notice and CSV export assume the original dashboard. Changing only sidebar labels would leave these behaviors incorrect.
- Existing right-edge, bottom-edge and corner resizing, focus dialogs, tables, storage validation and tests are useful foundations.

## 3. Category navigation and page behavior

Use URL-backed category state, initially through a small hash-route controller: `#/kpis/airside-operations`. This works on a static host without server rewrite configuration and avoids adding a router for one route family. Hide route parsing behind `useCategoryRoute` so production can adopt a routing library if the application gains additional pages.

Required behavior:

1. Sidebar links show the exact category labels, suitable icons and registered KPI counts. Use `aria-current="page"`. Long labels wrap; the navigation scrolls independently so 11 links remain reachable on smaller screens.
2. Selecting a category updates the URL, breadcrumb, page heading, summary, cards, applicable filters and export scope. Scroll the page to its heading and announce the new category to assistive technology.
3. Back/forward navigation and refreshing a valid URL restore the selected category. Unknown routes redirect to Airside Operations with a non-blocking explanation.
4. On mobile, selecting a category closes navigation and moves focus to the new page heading. Preserve the existing keyboard trap and Escape behavior.
5. Sidebar badges represent all registered KPIs in the category, independent of hidden cards. The page displays “7 of 9 KPIs visible” when appropriate. Hiding all cards still leaves a functional category and a Restore KPIs action.
6. A category change closes an open focus dialog. A KPI search result navigates to its owning category, then opens that KPI's focus view, including when its card is hidden.
7. Replace the fixed Terminal 2 security notice with category-specific fixture-derived notices; omit the notice if that category has no meaningful issue. Remove hard-coded “13” counts and the fixed Overview breadcrumb.

### Filters and exporting

Retain airport and time-window context across navigation. Maintain category-specific selections independently. The catalog declares supported filters for each KPI: terminal, movement, carrier/base carrier, runway, stand/apron, resource type, weather condition, and reporting granularity where applicable.

Hide controls irrelevant to the selected category. Within a category containing mixed scopes, explicitly label a KPI as airport-wide, unaffected by a selected filter, or not applicable. Never silently interpret a terminal as a runway or apply movement direction to physical capacity. Reset filters resets common filters plus the current category's filters; other categories retain their saved filter selections for the session.

Export all requirements in the active category, including hidden cards; label the action “Export category”. Use the same filtered models shown in the UI. Include category, KPI ID/name, unit, scope, as-of timestamp, state, numerator/denominator where relevant and static-demo status. Offer a separate detail export from report/table views. Report entries can export multiple rows; do not invent a numeric value to force them into a scalar CSV row.

## 4. Catalog, models and reusable views

Retain React, TypeScript, Vite, Tailwind, Lucide, Recharts, React Grid Layout, Radix, Zustand, TanStack Query and Zod. This expansion does not require a framework replacement or new chart library. Verify installed APIs during implementation and avoid unrelated dependency upgrades.

Introduce one declarative catalog with stable category IDs and globally unique KPI IDs. Every definition contains:

- Exact source name, category, short display name where needed and definition version.
- Unit, supported filters, time basis and aggregation rule.
- Display kind, default/minimum size, available breakdowns and detail columns.
- Data source description, required fields, target/tolerance configuration, exclusions and sample/denominator requirements.
- Definition status: provisional demo assumption or approved production definition.

Keep a discriminated display payload union for trends, bars, paired metrics, occupancy matrices, timelines, event tables, comparison tables and forecast/scenario views. Avoid 71 large conditionals inside one chart component. Family renderers consume models rather than raw fixture records.

Separate the metric definition, calculated result and user layout. A result includes its KPI ID, scope, time window, as-of timestamp, readiness state and payload. Missing observations, no eligible events and zero measured events must have distinct states. Category results contain only the selected category's KPI models. Focus details use the same calculation pipeline as the card.

Extend `TelemetrySource` to accept category plus normalized filters for snapshots, and KPI ID plus a typed breakdown request for details. Inject the source at the app boundary rather than importing the static adapter directly in query hooks. Query keys include airport, category/KPI, filters, breakdown and fixture/definition version. Propagate AbortSignal and render partial failures per KPI.

### Planned file responsibilities

| File/module                                      | Change                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `src/catalog/categories.ts`                      | Ordered 11-category definitions, IDs, labels and icons                     |
| `src/catalog/kpis/`                              | Category-level KPI definitions and all 71 stable IDs                       |
| `src/types.ts`                                   | Typed category, result, filter, detail and layout contracts                |
| `src/navigation/useCategoryRoute.ts`             | URL parsing, category changes and history navigation                       |
| `src/components/CategoryNavigation.tsx`          | Accessible category links, counts and search                               |
| `src/components/CategoryDashboard.tsx`           | Heading, filter scope, notices, loading/error/empty state                  |
| `src/App.tsx`                                    | Compose shell, active category, source provider and focus state            |
| `src/data/TelemetrySource.ts`, `useTelemetry.ts` | Category-aware source methods and cache keys                               |
| `src/data/fixtures/`                             | Coherent static flight, surface, resource, weather and terminal datasets   |
| `src/data/selectors/`                            | Tested calculators by domain; shared interval/rate helpers                 |
| `src/components/charts/`                         | Reusable renderers split out of `Charts.tsx`                               |
| `src/components/DashboardGrid.tsx`               | Render the active category's IDs and layout only                           |
| `src/components/KPICard.tsx`, `FocusDialog.tsx`  | Catalog-driven controls, definitions and details                           |
| `src/layout/`                                    | Category-scoped preferences, drafts and versioned migration                |
| `src/export/`                                    | Category snapshot and underlying-detail CSV export                         |
| `tests/`                                         | Catalog coverage, formulas, navigation, migration and browser interactions |

## 5. Complete requirements-to-view mapping

IDs below are proposed permanent identifiers. Visuals and calculations are implementation proposals, not airport-approved operational standards. The source wording is retained; any renamed display title must preserve the original name in metadata.

### Airside Operations — 9

| KPI ID             | Requirement                             | Proposed primary view                                           |
| ------------------ | --------------------------------------- | --------------------------------------------------------------- |
| ao-otp-all         | On-Time Performance (OTP) – All Flights | Percentage/donut, arrival/departure trend and eligible counts   |
| ao-otp-base        | OTP – Base/Hub Carrier Flights          | Base-carrier OTP trend and carrier breakdown                    |
| ao-sobt            | SOBT Adherence                          | Departure adherence %, tolerance bands and flight table         |
| ao-sibt            | SIBT Adherence                          | Arrival adherence %, tolerance bands and flight table           |
| ao-aobt            | AOBT Deviation                          | Signed actual off-block minus scheduled off-block distribution  |
| ao-aibt            | AIBT Deviation                          | Signed actual in-block minus scheduled in-block distribution    |
| ao-base-delay-60   | Base Flight Delay >60 min               | Count plus eligible-flight percentage and affected-flight table |
| ao-departure-delay | Average Departure Delay                 | Minutes trend and carrier breakdown                             |
| ao-arrival-delay   | Average Arrival Delay                   | Minutes trend and carrier breakdown                             |

### Turnaround Management — 6

| KPI ID              | Requirement                    | Proposed primary view                                      |
| ------------------- | ------------------------------ | ---------------------------------------------------------- |
| tm-turnaround-time  | Aircraft Turnaround Time       | Minutes by aircraft type/carrier with target               |
| tm-milestones       | Turnaround Milestone Adherence | Milestone adherence bars and per-turn timeline             |
| tm-turnaround-delay | Aircraft Turnaround Delay      | Actual duration minus planned duration, delayed-turn table |
| tm-tobt             | TOBT Adherence                 | Target off-block adherence and deviation distribution      |
| tm-tsat             | TSAT Adherence                 | Actual start-up approval versus target, adherence trend    |
| tm-ground-time      | Ground Time Utilization        | Productive ground-service time versus eligible ground time |

### Runway Operations — 6

| KPI ID           | Requirement                      | Proposed primary view                                    |
| ---------------- | -------------------------------- | -------------------------------------------------------- |
| ro-utilization   | Runway Utilization               | Occupied-time percentage and interval timeline           |
| ro-occupancy     | Runway Occupancy Time            | Occupancy seconds per movement, distribution by runway   |
| ro-incursions    | Runway Incursion Events          | Incident count and event timeline/table                  |
| ro-configuration | Runway Configuration Utilization | Time share per runway configuration                      |
| ro-capacity      | Runway Capacity Utilization      | Movements versus declared capacity in matching intervals |
| ro-throughput    | Arrival/Departure Throughput     | Arrivals and departures per time interval                |

### Apron Operations — 9

| KPI ID                  | Requirement                       | Proposed primary view                                          |
| ----------------------- | --------------------------------- | -------------------------------------------------------------- |
| ap-occupancy            | Apron Occupancy Rate              | Occupied eligible stand-minutes versus available stand-minutes |
| ap-congestion           | Apron Congestion Index            | Labeled demo index with component breakdown                    |
| ap-stand-utilization    | Stand Utilization                 | Stand matrix and occupancy timeline                            |
| ap-allocation-conflicts | Stand Allocation Conflicts        | Conflicting assignment count and time overlap table            |
| ap-vdgs                 | VDGS Compliance                   | Compliant eligible docking events %, exceptions table          |
| ap-taxi-time            | Aircraft Taxi Time                | Taxi-in/out duration by runway and stand                       |
| ap-taxi-deviation       | Taxi-Time Deviation               | Observed minus reference taxi time distribution                |
| ap-taxiway-congestion   | Taxiway Congestion                | Segment occupancy/queue heatmap without requiring a real map   |
| ap-taxi-proximity       | Aircraft Taxiing Proximity Events | Count and taxi-phase event table                               |

### Airside Safety — 8

| KPI ID                    | Requirement                        | Proposed primary view                                             |
| ------------------------- | ---------------------------------- | ----------------------------------------------------------------- |
| as-incursion-rate         | Runway Incursion Rate              | Rate with event count, exposure and configured scale              |
| as-aircraft-vehicle       | Aircraft–Vehicle Conflict Events   | Classified event count and severity breakdown                     |
| as-aircraft-aircraft      | Aircraft–Aircraft Proximity Events | Classified event count, phase and location table                  |
| as-aircraft-obstacle      | Aircraft–Structure/Obstacle Events | Classified event count and location table                         |
| as-fod                    | FOD Detection/Response Time        | Separate detection latency and response duration where measurable |
| as-wildlife               | Wildlife Strike/Event Rate         | Separate strike/event counts and rates with exposure              |
| as-follow-me-availability | Follow-Me Vehicle Availability     | Available service minutes versus required service minutes         |
| as-follow-me-response     | Follow-Me Response Time            | Request-to-arrival minutes and open-request age                   |

### Ground Support / Resources — 6

| KPI ID                  | Requirement                      | Proposed primary view                                       |
| ----------------------- | -------------------------------- | ----------------------------------------------------------- |
| gs-gpu                  | GPU Utilization                  | GPU in-use minutes versus serviceable available minutes     |
| gs-apu-gpu              | APU Usage vs. GPU Availability   | APU minutes paired with GPU availability for matching turns |
| gs-pbb                  | PBB Utilization                  | Bridge usage percentage and resource timeline               |
| gs-pbb-idle             | PBB Idle Time                    | Idle serviceable minutes by passenger boarding bridge       |
| gs-resource-utilization | Airside Resource Utilization     | Utilization by resource type and period                     |
| gs-allocation-success   | Resource Allocation Success Rate | Fulfilled eligible requests %, failed-request reasons       |

### Weather / LVP — 7

| KPI ID                | Requirement                            | Proposed primary view                                        |
| --------------------- | -------------------------------------- | ------------------------------------------------------------ |
| wl-compliance         | LVP Activation Compliance              | Required-versus-activated episodes and compliance percentage |
| wl-timeliness         | LVP Activation/Deactivation Timeliness | Separate activation and deactivation lag distributions       |
| wl-rvr                | RVR Availability                       | Valid runway visual range samples versus expected samples    |
| wl-metar-availability | METAR Availability Rate                | Received expected reports %, missing-report timeline         |
| wl-metar-timeliness   | METAR Issuance Timeliness              | Reports issued within configured deadline %, delay table     |
| wl-delay              | Weather-Related Delay %                | Weather-attributed delayed flights versus eligible flights   |
| wl-disruption         | Weather Disruption Duration            | Union of disruption intervals, episode timeline              |

### Operational Efficiency — 5

| KPI ID              | Requirement                          | Proposed primary view                                              |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| oe-capacity         | Airside Capacity Utilization         | Demand/capacity by domain; no unapproved composite score           |
| oe-stand-efficiency | Aircraft Stand Turnaround Efficiency | Planned versus actual stand-turn duration and compliant turns      |
| oe-taxi-efficiency  | Taxi Efficiency                      | Reference versus actual taxi duration, configured efficiency ratio |
| oe-reallocation     | Gate/Stand Reallocation Rate         | Reallocated assignments %, original/final allocation table         |
| oe-recovery         | Operational Disruption Recovery Time | Disruption-to-confirmed-recovery duration by episode               |

### Reporting & Analytics — 3

| KPI ID             | Requirement                                | Proposed primary view                                   |
| ------------------ | ------------------------------------------ | ------------------------------------------------------- |
| ra-resource-report | Granularity Reports – Resource Utilization | Report with 15-minute/hour/day aggregation and CSV      |
| ra-feed-failure    | Data-Feed Failure Rate                     | Failed expected deliveries %, source status history     |
| ra-drills          | Emergency Drill Completion Rate            | Completed scheduled drills %, due/completed drill table |

### Terminal Operations — 5

| KPI ID                    | Requirement                                             | Proposed primary view                                                            |
| ------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| to-bags                   | First Bag & Last Bag Delivery Time                      | Paired arrival-to-first-bag and arrival-to-last-bag metrics                      |
| to-cute                   | CUTE (Airline Check-in Counter) Utilization             | Active eligible counter-minutes versus available counter-minutes                 |
| to-reconciliation         | Baggage Reconciliation Accuracy                         | Correctly reconciled eligible bags %, discrepancy table                          |
| to-runway-report-accuracy | Runway Utilization Report Accuracy                      | Report/reference comparison under configured tolerance                           |
| to-predictive-flow        | Predictive Passenger Flow & Dynamic Resource Allocation | Precomputed forecast versus actual plus explicitly simulated allocation scenario |

Keep runway report accuracy under Terminal Operations because that is its placement in the source list; flag domain ownership for stakeholder review rather than silently moving it.

### Passenger Flow — 7

| KPI ID                    | Requirement                                | Proposed primary view                                             |
| ------------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| pf-throughput             | Passenger Throughput vs. Terminal Capacity | Passengers per interval versus matching interval capacity         |
| pf-boarding               | Processing Time - Boarding Gate            | Service duration distribution by boarding gate                    |
| pf-immigration-processing | Processing Time - Immigration              | Service duration distribution by immigration zone                 |
| pf-checkin-wait           | Check-in Queue Wait Time                   | Wait minutes by terminal/counter group                            |
| pf-security-wait          | Security Queue Wait Time                   | Wait minutes by checkpoint with labeled thresholds                |
| pf-immigration-wait       | Immigration Queue Wait Time                | Wait minutes by immigration zone                                  |
| pf-satisfaction           | Passenger Satisfaction Index               | Configured weighted score, response count and dimension breakdown |

## 6. Metric definitions and coherent fixture data

The requirement list names metrics but does not specify formulas, thresholds or data contracts. Record a versioned definition sheet for every KPI before implementing its calculator. A sheet must state numerator/denominator, units, cohort/time basis, early/late policy, excluded records, missing-data behavior, targets, sample size, required timestamps and drill-down dimensions.

For the PoC, documented assumptions allow implementation to proceed; production acceptance requires airport-owner agreement. Do not present demo thresholds as regulatory or operational standards.

Resolve these shared definition issues explicitly:

- OTP versus SOBT/SIBT adherence: schedule comparison may overlap, but thresholds and early-departure treatment can differ. Make them separate definitions backed by shared timestamps. Define base/hub carriers in airport configuration.
- Deviation is signed. Average delay uses a documented eligible population and treatment of early flights; never cancel positive delays with negative early times unintentionally. Label whether an average covers all eligible flights or delayed flights only.
- TOBT and TSAT can be revised. Freeze the comparison target at a defined operational cutoff and keep target-version history. TSAT needs a start-up approval event; do not substitute off-block time.
- FOD detection latency requires a known occurrence/onset timestamp. If onset is unknown, show unavailable detection latency while still calculating response time from detection to response/clearance.
- Safety counts and rates share event IDs and classifications. A runway incursion count must reconcile with its rate numerator; taxi-phase proximity events may be a subset of wider aircraft proximity events, not additional independent incidents.
- Adherence/rates return unavailable for zero eligible observations; measured zero events with positive exposure is a real zero. Provide exposure and reporting scale in details.
- Occupancy merges overlapping intervals per resource before aggregation. Exclude closed/unserviceable capacity where specified. Clip intervals to the selected window.
- Time-based utilization and movement-capacity utilization have different denominators. Terminal flow must compare passengers and capacity over the same duration.
- Queue waiting time and processing/service time use different start/end events. First/last bag delivery requires arrival-to-bag timestamps, unlike the existing first-to-last-bag metric.
- Reports need an independent reference dataset for accuracy. Feed availability and issuance timeliness are distinct; METAR arrival time alone cannot establish issuance timeliness.
- Congestion indexes, satisfaction scores, ground-time productivity, airside capacity and stand efficiency need explicit demo weights/reference values. Expose components and avoid treating unrelated resources as directly additive.
- Predictive flow uses precomputed fixture forecasts, clearly labeled as a scenario. Allocation suggestions are read-only and never claim to dispatch resources or demonstrate a trained model.

### Fixture families

Create linked static records for flights and revisions; paired turns and milestones; runway movements/closures/configurations; stand assignments and taxi segments; deduplicated safety events; resource availability/usage/requests; weather episodes and expected/received reports; disruptions and recovery; baggage/counter/queue/service events; passenger counts/capacity; surveys; feed delivery expectations; drill schedules; report reference samples; and precomputed forecasts/scenarios.

Use stable flight, turn, resource and event IDs. Generate enough history for all demo time windows and the report's day aggregation. Supply normal, delayed, missing, no-event and partial-coverage cases. The same records must drive related cards and tables so category totals reconcile. Centralize timezone, targets, reference taxi times, carrier classification and demo thresholds in configuration.

## 7. Category layouts and migration

Introduce layout schema v2: airport ID plus a map keyed by category ID. Each category owns desktop/tablet/mobile positions, hidden IDs, card display preferences and update metadata. Store drafts separately by category. Switching categories retains unsaved edits; returning shows “Unsaved layout changes”. Save/Cancel/Reset affect only the active category. A page reload may discard unsaved drafts, with a navigation warning when appropriate; never silently save them.

Preserve cursor resizing from the current implementation: right edge changes width, bottom edge changes height and corner changes both. Keep keyboard move/size alternatives. Do not automatically stretch cards after a drag; saved user dimensions remain authoritative. Category-specific default layouts should fill rows sensibly, and users can adjust remaining gaps with the edge handles.

Migration must not reinterpret a current metric as a different requirement:

| Existing card                                            | Proposed treatment                                                                                                           |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| OTP, turnaround time, runway utilization, security waits | Reuse renderers/calculators after definition checks; map compatible preferences to corresponding new IDs                     |
| Passenger throughput                                     | Reuse trend renderer; add time-matched terminal capacity instead of reusing forecast as capacity                             |
| Baggage delivery                                         | Replace calculation with arrival-to-first/last-bag; preserve no value semantics from the old span metric                     |
| Check-in queue density                                   | New queue-wait calculator; density is not wait time                                                                          |
| Gate availability                                        | Reuse matrix view for stand/apron data; gate and stand identities require an explicit mapping                                |
| Flight status summary                                    | Reuse underlying records in details; not a separate requirement in the new catalog                                           |
| Cargo, parking, revenue, baggage mishandling             | Exclude from the new 71-entry navigation; retain legacy preference backup rather than assigning them to unrelated categories |

Read the old storage key once; retain it as a recovery copy. Validate every new category layout, restrict IDs to its registry membership, apply minimum sizes and bounds, resolve collisions through packing, and append missing definitions. Since membership and default sizes change, preserve compatible width/height/display preferences and repack positions within the new category rather than copying global x/y positions. Fall back per category when a stored category is malformed, and report the recovery. Never overwrite legacy storage after a failed migration.

## 8. Delivery sequence and exit criteria

### Phase 0 — Baseline and catalog contract

Confirm the standalone GitHub repository contains every tracked source file, including `src/App.tsx`, and builds from a clean clone. The prior migration's local and remote tree hashes differed; compare complete file inventories before treating the remote as the implementation baseline. Preserve existing user changes.

Turn all 71 source entries into the typed catalog and definition sheets. Record assumptions with owners/status. Freeze category IDs and KPI IDs. Archive the source requirement list with the plan.

**Exit:** automated catalog test proves exactly 11 categories, 71 entries, unique IDs and one-to-one coverage of the source names.

### Phase 1 — Working category navigation and layout foundation

Implement URL selection, sidebar replacement, category titles/counts, scoped queries/exports and v2 layouts. Use the existing compatible metrics as the first end-to-end slice. If the app is demonstrated between phases, categories not yet populated must explicitly say “Not yet implemented”; do not imply all requirements are complete.

**Exit:** category selection genuinely changes cards; reload/back/forward work; layout edits in one category never change another; compatible legacy preferences migrate and edge resizing persists.

### Phase 2 — Flight, turnaround and runway metrics

Complete coherent flight/turn/runway fixtures and all 21 requirements in Airside Operations, Turnaround Management and Runway Operations. Add shared adherence, deviation, interval, target-version and delay calculators.

**Exit:** values reconcile with underlying flight/movement rows; boundary and missing-time tests pass; all 21 focus views contain usable details.

### Phase 3 — Apron, safety and resources

Complete all 23 requirements in Apron Operations, Airside Safety and Ground Support / Resources using shared events, assignments and resource intervals.

**Exit:** conflict detection, utilization and safety exposure calculations are tested; shared event counts reconcile; availability and usage remain distinct.

### Phase 4 — Weather, efficiency and reporting

Complete all 15 requirements in Weather / LVP, Operational Efficiency and Reporting & Analytics. Resource reports depend on phase 3 data; capacity/taxi efficiency reuse phase 2–3 records.

**Exit:** weather episode timing, denominator handling, feed expectations, recovery periods and report aggregation/export pass domain tests.

### Phase 5 — Terminal and passenger requirements

Complete all 12 requirements in Terminal Operations and Passenger Flow. Supply separate queue/service events, baggage timestamps, surveys, reference reports and forecast scenarios.

**Exit:** passenger capacity comparisons use matched time windows; bag and processing metrics have correct event pairs; simulated predictions and allocations are clearly identified.

### Phase 6 — PoC acceptance and documentation

Run the checks below, refresh the demo walkthrough and architecture notes, document all provisional formulas, and publish the completed implementation to the standalone repository. Do not describe operational deployment or live integrations as completed.

**Exit:** all 71 requirements have working category views, details and export behavior; there are no unfinished-category messages in the accepted PoC.

## 9. Verification and acceptance checklist

- Catalog/source reconciliation: category counts are 9, 6, 6, 9, 8, 6, 7, 5, 3, 5 and 7; total is 71. Every definition has a renderer, fixture source, calculation, supported filters and detail view.
- Navigation: exercise all 11 links, visible titles, actual card membership, URL refresh, browser history, unknown URLs, category search and mobile focus return.
- Layout: drag, horizontal resize without height change, vertical/corner resize, keyboard order/size, save/reload, hide/undo/restore/reset, all-hidden state, per-category isolation and retained drafts across navigation.
- Migration: valid v1, malformed v1, unknown IDs, retired cards, missing new cards, out-of-bounds sizes, per-category corrupt v2 and blocked storage. Preserve legacy recovery data and truthful save errors.
- Metrics: boundary times, timezone midnight, target revisions, weighted means, overlap unions, zero denominators, negative deviations, cancelled/pending flights, incomplete events and matching capacity windows.
- Reconciliation: incursion events equal rate numerators, turnaround details match aggregates, resource reports match utilization cards and every CSV uses the current category's normalized filters.
- Focus: open every KPI, switch its supported breakdowns, read real HTML tables, close with Escape, restore focus and verify no growing observer/subscription count through repeated cycles.
- Responsive/accessibility: test 390/768/1440/1920 widths, long category names, scrollable sidebar, readable minimum card sizes, no horizontal page overflow, keyboard operation, reduced motion and axe checks. Schedule manual screen-reader review before claiming full accessibility compliance.
- Performance: mount charts only for the active category; render details on demand; bound category caches; verify navigation remains responsive and no stale category response appears after a quick switch. Record observed timings rather than claiming unmeasured service guarantees.
- Required commands: clean dependency install, typecheck, lint, unit tests, production build, format check and browser tests against that production build. Verify published tree/file contents match the tested implementation.

## 10. Production extension boundary

The static PoC should expose a stable data adapter and versioned metric catalog, not operational integrations. Production work follows acceptance: approve definitions and data ownership; connect authenticated source APIs with response validation; implement server-enforced airport/role permissions; store revision-aware user layouts; define freshness and partial-failure behavior per feed; add monitoring, auditability and recovery. Safety data completeness, forecast validity and operational decision use require separate domain validation. Keep those concerns explicit in the handoff instead of adding unsupported live or predictive claims to the PoC.
