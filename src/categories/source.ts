import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoryEntries, type CategoryId, type KpiId } from './catalog';
import {
  flights,
  resources,
  stands,
  safetyEvents,
  weatherEpisodes,
  terminalSamples,
  reports,
  drills,
  intervals,
} from './fixtures';
import {
  AS_OF,
  FIXTURE_VERSION,
  options,
  windowStart,
  type CategoryFilters,
  type CategorySnapshot,
  type Dimension,
  type KpiResult,
  type MetricSpec,
  type Observation,
  type Scope,
} from './models';
const specs = {} as Record<KpiId, MetricSpec>;
const observations = {} as Record<KpiId, Observation[]>;
function define(
  id: KpiId,
  unit: string,
  aggregation: MetricSpec['aggregation'],
  formula: string,
  source: string,
  dimensions: Dimension[],
  rows: Observation[],
  extra: Partial<MetricSpec> = {},
) {
  specs[id] = { unit, aggregation, formula, source, dimensions, ...extra };
  observations[id] = rows;
}
function row(
  id: string,
  minute: number,
  label: string,
  numerator: number,
  denominator = 1,
  scope: Scope = {},
  reference?: number,
  note?: string,
): Observation {
  return { id, minute, label, numerator, denominator, ...scope, reference, note };
}
const eligible = flights.filter((f) => !f.cancelled && f.completed);
const completed = eligible.filter((f) => f.movement === 'departures');
const flightDims: Dimension[] = ['terminal', 'movement', 'carrier', 'runway'];
const fr = (
  fn: (f: (typeof flights)[number]) => number,
  subset = eligible,
  reference?: (f: (typeof flights)[number]) => number,
) => subset.map((f) => row(f.id, f.actual, f.id, fn(f), 1, f, reference?.(f)));
define(
  'ao-otp-all',
  '%',
  'percent',
  'Completed non-cancelled movements no more than 15 minutes late / eligible completed movements. Early movements count as on time.',
  'Flight actual and scheduled block times',
  flightDims,
  fr((f) => +(f.actual - f.scheduled <= 15)),
  { target: 85, higherBetter: true },
);
define(
  'ao-otp-base',
  '%',
  'percent',
  specs['ao-otp-all'].formula + ' Base carrier: Meridian Air.',
  'Flight records and carrier classification',
  flightDims,
  fr(
    (f) => +(f.actual - f.scheduled <= 15),
    eligible.filter((f) => f.base),
  ),
  { target: 85, higherBetter: true },
);
for (const [id, movement, label] of [
  ['ao-sobt', 'departures', 'off-block'],
  ['ao-sibt', 'arrivals', 'in-block'],
] as const)
  define(
    id,
    '%',
    'percent',
    'Actual ' +
      label +
      ' within ±5 minutes of schedule / eligible completed movements. Demo tolerance.',
    'Flight block timestamps',
    flightDims,
    fr(
      (f) => +(Math.abs(f.actual - f.scheduled) <= 5),
      eligible.filter((f) => f.movement === movement),
    ),
    { target: 80, higherBetter: true },
  );
for (const [id, movement] of [
  ['ao-aobt', 'departures'],
  ['ao-aibt', 'arrivals'],
] as const)
  define(
    id,
    'min',
    'mean',
    'Mean signed actual minus scheduled block time. Negative values mean early.',
    'Flight block timestamps',
    flightDims,
    fr(
      (f) => f.actual - f.scheduled,
      eligible.filter((f) => f.movement === movement),
    ),
  );
define(
  'ao-base-delay-60',
  'flights',
  'sum',
  'Base-carrier completed flights more than 60 minutes late. Details show 0/1 per eligible flight.',
  'Flight block timestamps',
  flightDims,
  fr(
    (f) => +(f.actual - f.scheduled > 60),
    eligible.filter((f) => f.base),
  ),
);
for (const [id, movement] of [
  ['ao-departure-delay', 'departures'],
  ['ao-arrival-delay', 'arrivals'],
] as const)
  define(
    id,
    'min',
    'mean',
    'Mean max(0, actual minus scheduled) across all eligible completed movements; early times contribute zero.',
    'Flight block timestamps',
    flightDims,
    fr(
      (f) => Math.max(0, f.actual - f.scheduled),
      eligible.filter((f) => f.movement === movement),
    ),
    { target: 15 },
  );
const turnDims: Dimension[] = ['terminal', 'carrier'];
define(
  'tm-turnaround-time',
  'min',
  'mean',
  'Completed paired turns: actual off-block minus on-block.',
  'Paired aircraft turns',
  turnDims,
  fr(
    (f) => f.turn,
    completed,
    (f) => f.plannedTurn,
  ),
  { target: 45, pairLabel: 'Planned' },
);
define(
  'tm-milestones',
  '%',
  'percent',
  'Milestones within ±5 minutes of frozen plan / recorded milestones.',
  'Turn milestone events',
  turnDims,
  completed.flatMap((f) =>
    f.milestoneOffsets.map((offset, i) =>
      row(
        f.id + '-M' + i,
        f.actual,
        f.id + ' · ' + ['Fuel', 'Boarding', 'Ready'][i],
        +(Math.abs(offset) <= 5),
        1,
        f,
        undefined,
        'Deviation ' + offset + ' min',
      ),
    ),
  ),
  { higherBetter: true, target: 90 },
);
define(
  'tm-turnaround-delay',
  'min',
  'mean',
  'Mean positive actual minus planned turn duration, across completed turns.',
  'Paired turns and planned durations',
  turnDims,
  fr((f) => Math.max(0, f.turn - f.plannedTurn), completed),
);
define(
  'tm-tobt',
  '%',
  'percent',
  'Off-block within ±5 minutes of TOBT frozen 30 minutes before scheduled departure.',
  'Frozen target and actual off-block events',
  turnDims,
  fr((f) => +(Math.abs(f.actual - f.tobt) <= 5), completed),
  { target: 85, higherBetter: true },
);
define(
  'tm-tsat',
  '%',
  'percent',
  'Actual start-up approval within ±5 minutes of frozen TSAT. Uses approval, not off-block.',
  'Start-up approvals and frozen targets',
  turnDims,
  fr((f) => +(Math.abs(f.startApproval - f.tsat) <= 5), completed),
  { target: 85, higherBetter: true },
);
define(
  'tm-ground-time',
  '%',
  'percent',
  'Demo productive service minutes / completed turn minutes; service interval is [on-block+4, off-block-6].',
  'Turn service intervals',
  turnDims,
  completed.map((f) => row(f.id, f.actual, f.id, Math.max(0, f.turn - 10), f.turn, f)),
  { higherBetter: true },
);
const runwayRows = options.runway.flatMap((runway) =>
  intervals.map(({ start, end }) => {
    const movements = eligible.filter(
      (f) => f.runway === runway && f.actual >= start && f.actual < end,
    );
    return {
      runway,
      start,
      end,
      movements,
      seconds: movements.reduce((n, f) => n + f.runwaySeconds, 0),
    };
  }),
);
define(
  'ro-utilization',
  '%',
  'percent',
  'Sum of non-overlapping runway occupancy seconds / open runway seconds. Fixture movements are separated by at least five minutes.',
  'Runway movement intervals',
  ['runway'],
  runwayRows.map((r) =>
    row(r.runway + r.start, r.end, r.runway, r.seconds, 900, { runway: r.runway }),
  ),
);
define(
  'ro-occupancy',
  'sec',
  'mean',
  'Mean runway occupancy seconds per completed movement.',
  'Runway movement intervals',
  ['runway', 'movement'],
  fr((f) => f.runwaySeconds),
);
const eventRows = (kind: string) =>
  safetyEvents
    .filter((e) => e.kind === kind)
    .map((e) =>
      row(e.id, e.minute, e.id + ' · ' + e.kind, 1, 1, e, undefined, e.severity + ' / ' + e.phase),
    );
define(
  'ro-incursions',
  'events',
  'count',
  'Deduplicated runway incursion events recorded in the window. A measured zero is distinct from missing coverage.',
  'Safety event registry',
  ['runway'],
  eventRows('incursion'),
  { kind: 'events' },
);
define(
  'ro-configuration',
  '%',
  'percent',
  'Minutes in east-flow configuration / open configuration minutes. West-flow is the remainder.',
  'Runway configuration intervals',
  [],
  intervals.map((r) =>
    row(
      'CFG' + r.start,
      r.end,
      r.start < 480 ? 'East flow' : 'West flow',
      r.start < 480 ? 15 : 0,
      15,
    ),
  ),
  { pairLabel: 'West flow' },
);
define(
  'ro-capacity',
  '%',
  'percent',
  'Completed movements / declared movement capacity (4 per runway per 15-minute interval in demo).',
  'Movements and capacity declarations',
  ['runway'],
  runwayRows.map((r) =>
    row(r.runway + r.start, r.end, r.runway, r.movements.length, 4, { runway: r.runway }),
  ),
);
define(
  'ro-throughput',
  'movements',
  'sum',
  'Completed movements within the window, split by movement direction.',
  'Flight movement events',
  ['runway', 'movement'],
  fr(() => 1),
);
const sr = stands.flatMap((s) =>
  s.intervals.map((i) => ({ ...i, ...{ id: s.id, terminal: s.terminal, apron: s.apron } })),
);
const standDims: Dimension[] = ['terminal'];
define(
  'ap-occupancy',
  '%',
  'percent',
  'Occupied serviceable stand-minutes / available stand-minutes.',
  'Stand occupancy intervals',
  standDims,
  sr.filter((r) => r.available).map((r) => row(r.id + r.start, r.end, r.apron, r.used, 15, r)),
);
define(
  'ap-congestion',
  'index',
  'mean',
  'Demo congestion index = queue / 4 × 100. Components are queued surface movements; not an approved airport index.',
  'Apron queue observations',
  standDims,
  sr.map((r) => row(r.id + r.start, r.end, r.apron, r.queue * 25, 1, r)),
);
define(
  'ap-stand-utilization',
  '%',
  'percent',
  'Occupied stand-minutes / serviceable available stand-minutes, by stand.',
  'Stand occupancy intervals',
  standDims,
  sr.filter((r) => r.available).map((r) => row(r.id + r.start, r.end, r.id, r.used, 15, r)),
);
define(
  'ap-allocation-conflicts',
  'conflicts',
  'sum',
  'Count of overlapping assignment alerts; each fixture conflict has one stable stand/interval identity.',
  'Stand allocation conflict observations',
  standDims,
  sr.map((r) => row(r.id + r.start, r.end, r.id, +r.conflict, 1, r)),
  { kind: 'events' },
);
define(
  'ap-vdgs',
  '%',
  'percent',
  'Compliant docking events / eligible completed arrivals.',
  'Visual docking guidance events',
  standDims,
  fr(
    (f) => +f.vdgs,
    eligible.filter((f) => f.movement === 'arrivals'),
  ),
  { higherBetter: true, target: 98 },
);
define(
  'ap-taxi-time',
  'min',
  'mean',
  'Arrivals: landing-to-in-block taxi-in. Departures: off-block-to-takeoff taxi-out.',
  'Surface movement timestamps',
  flightDims,
  fr((f) => (f.movement === 'arrivals' ? f.taxiIn : f.taxiOut)),
);
define(
  'ap-taxi-deviation',
  'min',
  'mean',
  'Signed observed taxi minutes minus demo reference: arrival 8 min, departure 12 min.',
  'Taxi observations and reference durations',
  flightDims,
  fr((f) => (f.movement === 'arrivals' ? f.taxiIn - 8 : f.taxiOut - 12)),
);
define(
  'ap-taxiway-congestion',
  'queued',
  'mean',
  'Mean queued surface movements per segment observation. Segments are represented by stand access routes.',
  'Surface queue observations',
  standDims,
  sr.map((r) => row(r.id + r.start, r.end, 'Access ' + r.id, r.queue, 1, r)),
);
define(
  'ap-taxi-proximity',
  'events',
  'count',
  'Deduplicated aircraft proximity events during taxi phase; subset of all aircraft proximity events.',
  'Safety event registry',
  ['terminal'],
  eventRows('proximity').filter((r) => r.note?.endsWith('taxi')),
  { kind: 'events' },
);
define(
  'as-incursion-rate',
  '/10k',
  'rate',
  'Deduplicated incursions / completed movements × 10,000.',
  'Safety registry and flight exposure',
  ['runway'],
  runwayRows.map((r) =>
    row(
      r.runway + r.start,
      r.end,
      r.runway,
      safetyEvents.filter(
        (e) =>
          e.kind === 'incursion' &&
          e.runway === r.runway &&
          e.minute >= r.start &&
          e.minute < r.end,
      ).length,
      r.movements.length,
      { runway: r.runway },
    ),
  ),
  { scale: 10000 },
);
for (const [id, kind] of [
  ['as-aircraft-vehicle', 'vehicle'],
  ['as-aircraft-aircraft', 'proximity'],
  ['as-aircraft-obstacle', 'obstacle'],
] as const)
  define(
    id,
    'events',
    'count',
    'Count of deduplicated ' +
      kind +
      ' events; classifications share the common safety event registry.',
    'Safety event registry',
    ['terminal'],
    eventRows(kind),
    { kind: 'events' },
  );
define(
  'as-fod',
  'min',
  'mean',
  'Mean detection-to-response minutes. Paired detection latency uses known onset only; unknown onset is excluded from that mean.',
  'FOD event and response timestamps',
  [],
  safetyEvents
    .filter((e) => e.kind === 'fod')
    .map((e) =>
      row(
        e.id,
        e.minute,
        e.id,
        e.response,
        1,
        e,
        e.onset === null ? undefined : e.minute - e.onset,
        e.onset === null ? 'Onset unknown; detection latency unavailable' : 'Known onset',
      ),
    ),
  { pairLabel: 'Detection latency' },
);
define(
  'as-wildlife',
  '/10k',
  'rate',
  'Wildlife events (including strikes) / completed movements × 10,000. Row notes separately identify strikes.',
  'Safety event registry and movement exposure',
  [],
  intervals.map((i) =>
    row(
      'W' + i.start,
      i.end,
      'Wildlife',
      safetyEvents.filter(
        (e) => e.kind.startsWith('wildlife') && e.minute >= i.start && e.minute < i.end,
      ).length,
      eligible.filter((f) => f.actual >= i.start && f.actual < i.end).length,
      {},
      undefined,
      'Strikes: ' +
        safetyEvents.filter(
          (e) => e.kind === 'wildlife-strike' && e.minute >= i.start && e.minute < i.end,
        ).length,
    ),
  ),
  { scale: 10000 },
);
const rr = resources.flatMap((r) =>
  r.intervals.map((i) => ({ ...i, id: r.id, terminal: r.terminal, resource: r.resource })),
);
const rd: Dimension[] = ['terminal', 'resource'];
define(
  'as-follow-me-availability',
  '%',
  'percent',
  'Serviceable Follow-Me vehicle minutes / required fleet minutes.',
  'Resource availability calendar',
  ['terminal'],
  rr
    .filter((r) => r.resource === 'Follow-Me')
    .map((r) => row(r.id + r.start, r.end, r.id, r.available ? 15 : 0, 15, r)),
  { higherBetter: true, target: 95 },
);
define(
  'as-follow-me-response',
  'min',
  'mean',
  'Request-to-arrival response minutes for fulfilled Follow-Me requests, weighted by fulfilled request count.',
  'Resource dispatch records',
  ['terminal'],
  rr
    .filter((r) => r.resource === 'Follow-Me' && r.available)
    .map((r) => row(r.id + r.start, r.end, r.id, r.response * r.fulfilled, r.fulfilled, r)),
);
for (const [id, resource] of [
  ['gs-gpu', 'GPU'],
  ['gs-pbb', 'PBB'],
] as const)
  define(
    id,
    '%',
    'percent',
    'In-use minutes / serviceable available minutes for ' + resource + '.',
    'Resource usage intervals',
    ['terminal'],
    rr
      .filter((r) => r.resource === resource && r.available)
      .map((r) => row(r.id + r.start, r.end, r.id, r.used, 15, r)),
  );
define(
  'gs-apu-gpu',
  'min',
  'sum',
  'APU usage minutes during GPU serviceable intervals. Paired value is the available GPU minutes in the same intervals.',
  'Aircraft support usage intervals',
  ['terminal'],
  rr
    .filter((r) => r.resource === 'GPU' && r.available)
    .map((r) => row(r.id + r.start, r.end, r.id, r.apu, 1, r, 15)),
  { pairLabel: 'GPU available minutes' },
);
define(
  'gs-pbb-idle',
  'min',
  'sum',
  'Serviceable PBB interval minutes minus in-use minutes.',
  'Bridge usage intervals',
  ['terminal'],
  rr
    .filter((r) => r.resource === 'PBB' && r.available)
    .map((r) => row(r.id + r.start, r.end, r.id, 15 - r.used, 1, r)),
);
define(
  'gs-resource-utilization',
  '%',
  'percent',
  'In-use resource-minutes / serviceable resource-minutes, within selected type.',
  'Resource usage intervals',
  rd,
  rr.filter((r) => r.available).map((r) => row(r.id + r.start, r.end, r.resource, r.used, 15, r)),
);
define(
  'gs-allocation-success',
  '%',
  'percent',
  'Fulfilled requests / requested allocations; unavailable resources fulfill none.',
  'Resource request ledger',
  rd,
  rr.map((r) => row(r.id + r.start, r.end, r.id, r.available ? r.fulfilled : 0, r.requested, r)),
  { higherBetter: true, target: 95 },
);
define(
  'wl-compliance',
  '%',
  'percent',
  'Required LVP episodes activated within five minutes of requirement / required episodes. Demo policy.',
  'Weather condition and activation events',
  [],
  weatherEpisodes.map((e) => row(e.id, e.start, e.id, +(e.activated - e.start <= 5), 1)),
  { higherBetter: true, target: 100 },
);
define(
  'wl-timeliness',
  'min',
  'mean',
  'Mean requirement-to-activation lag; paired mean clearance-to-deactivation lag.',
  'LVP activation/deactivation events',
  [],
  weatherEpisodes.map((e) =>
    row(e.id, e.start, e.id, e.activated - e.start, 1, {}, e.deactivated - e.end),
  ),
  { pairLabel: 'Deactivation lag' },
);
define(
  'wl-rvr',
  '%',
  'percent',
  'Valid RVR observation intervals / expected observation intervals.',
  'RVR observation log',
  [],
  reports.map((r) => row(r.id, r.end, r.id, +r.rvrValid, 1)),
  { higherBetter: true, target: 99 },
);
define(
  'wl-metar-availability',
  '%',
  'percent',
  'Received METARs / expected scheduled reports.',
  'Expected and received weather reports',
  [],
  reports.map((r) => row(r.id, r.end, r.id, +r.received, 1)),
  { higherBetter: true, target: 99 },
);
define(
  'wl-metar-timeliness',
  '%',
  'percent',
  'Expected reports received and issued within five minutes of schedule / expected reports.',
  'METAR issue timestamps',
  [],
  reports.map((r) => row(r.id, r.end, r.id, +(r.received && r.issued - r.start <= 5), 1)),
  { higherBetter: true, target: 95 },
);
const affected = (minute: number) =>
  weatherEpisodes.some((e) => minute >= e.start && minute < e.end);
define(
  'wl-delay',
  '%',
  'percent',
  'Completed delayed flights attributed to active weather episodes / eligible completed flights. Attribution is a fixed demo rule.',
  'Flight delay attribution',
  flightDims,
  fr((f) => +(f.actual > f.scheduled && affected(f.scheduled))),
);
define(
  'wl-disruption',
  'min',
  'sum',
  'Minutes covered by weather disruption intervals, clipped to each reporting interval; episodes do not overlap.',
  'Weather disruption intervals',
  [],
  intervals.map((i) =>
    row(
      'WX' + i.start,
      i.end,
      'Weather',
      weatherEpisodes.reduce(
        (n, e) => n + Math.max(0, Math.min(i.end, e.end) - Math.max(i.start, e.start)),
        0,
      ),
    ),
  ),
);
define(
  'oe-capacity',
  '%',
  'percent',
  'Movement-domain utilization only: completed runway movements / declared movement capacity. No cross-domain composite.',
  'Movement capacity declarations',
  ['runway'],
  observations['ro-capacity'],
);
define(
  'oe-stand-efficiency',
  '%',
  'percent',
  'Completed stand turns at or below their planned duration / completed turns.',
  'Paired aircraft turns',
  turnDims,
  fr((f) => +(f.turn <= f.plannedTurn), completed),
  { higherBetter: true, target: 85 },
);
define(
  'oe-taxi-efficiency',
  '%',
  'percent',
  'Reference taxi minutes / observed taxi minutes. Above 100% means faster than reference.',
  'Taxi observations and references',
  flightDims,
  eligible.map((f) =>
    row(
      f.id,
      f.actual,
      f.id,
      f.movement === 'arrivals' ? 8 : 12,
      f.movement === 'arrivals' ? f.taxiIn : f.taxiOut,
      f,
    ),
  ),
  { higherBetter: true },
);
define(
  'oe-reallocation',
  '%',
  'percent',
  'Completed flights with revised stand allocation / completed flights.',
  'Allocation revision ledger',
  turnDims,
  fr((f) => +f.reallocated),
);
define(
  'oe-recovery',
  'min',
  'mean',
  'Confirmed recovery timestamp minus disruption onset for completed episodes.',
  'Disruption recovery events',
  [],
  weatherEpisodes.map((e) => row(e.id, e.recovered, e.id, e.recovered - e.start)),
);
define(
  'ra-resource-report',
  '%',
  'percent',
  'In-use minutes / serviceable available minutes, regrouped at selected granularity; ratios recomputed from sums.',
  'Resource usage intervals',
  rd,
  observations['gs-resource-utilization'],
  { kind: 'report' },
);
define(
  'ra-feed-failure',
  '%',
  'percent',
  'Failed expected feed deliveries / expected feed deliveries.',
  'Feed delivery expectations and receipts',
  [],
  reports.map((r) => row(r.id, r.end, 'Integration feeds', r.feedFailures, r.expectedFeeds)),
);
define(
  'ra-drills',
  '%',
  'percent',
  'Completed due drills / scheduled due drills.',
  'Drill schedule and completion ledger',
  [],
  drills.map((r) => row(r.id, r.minute, r.label, +r.completed, 1)),
  { higherBetter: true, target: 100 },
);
const arrivals = eligible.filter((f) => f.movement === 'arrivals' && f.lastBag <= 840);
define(
  'to-bags',
  'min',
  'mean',
  'First bag minus actual in-block; paired last bag minus actual in-block. Cohort: deliveries completed in window.',
  'Arrival and belt event timestamps',
  ['terminal', 'carrier'],
  arrivals.map((f) =>
    row(f.id, f.lastBag, f.id, f.firstBag - f.actual, 1, f, f.lastBag - f.actual),
  ),
  { pairLabel: 'Last bag' },
);
const ps = (
  fn: (r: (typeof terminalSamples)[number]) => number,
  den: (r: (typeof terminalSamples)[number]) => number = () => 1,
  ref?: (r: (typeof terminalSamples)[number]) => number,
) => terminalSamples.map((r) => row(r.id, r.end, r.terminal, fn(r), den(r), r, ref?.(r)));
define(
  'to-cute',
  '%',
  'percent',
  'Occupied counter-minutes / available counter-minutes.',
  'Common-use counter observations',
  ['terminal'],
  ps(
    (r) => r.counterUsed,
    (r) => r.counterAvailable,
  ),
);
define(
  'to-reconciliation',
  '%',
  'percent',
  'Correctly reconciled bags / eligible handled bags.',
  'Baggage reconciliation ledger',
  ['terminal'],
  ps(
    (r) => r.correctBags,
    (r) => r.bags,
  ),
  { higherBetter: true, target: 99.5 },
);
define(
  'to-runway-report-accuracy',
  '%',
  'percent',
  'Reported runway occupancy within ±2 percentage points of independent reference / reporting samples. Ownership retained as requested.',
  'Published reports and independent audit samples',
  ['runway'],
  runwayRows.map((r, i) =>
    row(
      r.runway + r.start,
      r.end,
      r.runway,
      +(i % 19 !== 0),
      1,
      { runway: r.runway },
      r.seconds / 9,
      'Reported ' +
        (r.seconds / 9 + (i % 19 === 0 ? 4 : 1)).toFixed(1) +
        '%; reference ' +
        (r.seconds / 9).toFixed(1) +
        '%',
    ),
  ),
  { higherBetter: true, target: 99 },
);
define(
  'to-predictive-flow',
  'passengers',
  'sum',
  'Precomputed demo forecast; paired actual passenger count. Read-only scenario allocates one processing desk per 60 forecast passengers per interval. No trained model or live dispatch.',
  'Fixed forecast scenario and terminal counts',
  ['terminal'],
  ps(
    (r) => r.forecast,
    () => 1,
    (r) => r.passengers,
  ),
  { kind: 'scenario', pairLabel: 'Observed passengers' },
);
define(
  'pf-throughput',
  '%',
  'percent',
  'Passenger movements / terminal capacity in matching 15-minute intervals.',
  'Terminal counts and interval capacity',
  ['terminal'],
  ps(
    (r) => r.passengers,
    (r) => r.capacity,
  ),
);
for (const [id, key] of [
  ['pf-boarding', 'boarding'],
  ['pf-immigration-processing', 'immigration'],
  ['pf-checkin-wait', 'checkinWait'],
  ['pf-security-wait', 'securityWait'],
  ['pf-immigration-wait', 'immigrationWait'],
] as const)
  define(
    id,
    'min',
    'mean',
    (key.endsWith('Wait') ? 'Queue entry to service start' : 'Service start to completion') +
      ' minutes, weighted by sampled passenger count.',
    'Terminal processing/queue observations',
    ['terminal'],
    ps(
      (r) => r[key] * r.passengers,
      (r) => r.passengers,
    ),
    { target: key.endsWith('Wait') ? 10 : 5 },
  );
define(
  'pf-satisfaction',
  '/100',
  'mean',
  'Response-weighted mean survey score on 0–100 scale. Demo uses one overall experience question.',
  'Passenger survey responses',
  ['terminal'],
  ps(
    (r) => r.satisfaction * r.responses,
    (r) => r.responses,
  ),
  { higherBetter: true, target: 80 },
);

export { specs, observations };
export function aggregate(rows: Observation[], spec: MetricSpec): number | null {
  const n = rows.reduce((s, r) => s + r.numerator, 0),
    d = rows.reduce((s, r) => s + r.denominator, 0);
  if (spec.aggregation === 'count') return rows.length;
  if (!rows.length) return null;
  if (spec.aggregation === 'sum') return n;
  return d > 0
    ? (n / d) *
        (spec.aggregation === 'percent' ? 100 : spec.aggregation === 'rate' ? (spec.scale ?? 1) : 1)
    : null;
}
export function calculate(id: KpiId, filters: CategoryFilters): KpiResult {
  const spec = specs[id],
    start = windowStart(filters.range);
  const rows = observations[id].filter(
    (r) =>
      r.minute > start &&
      r.minute <= 840 &&
      spec.dimensions.every((dim) => filters[dim] === 'all' || r[dim] === filters[dim]),
  );
  const movementConflict =
    spec.dimensions.includes('movement') &&
    filters.movement !== 'all' &&
    observations[id].length > 0 &&
    !observations[id].some((r) => r.movement === filters.movement);
  const value = movementConflict ? null : aggregate(rows, spec);
  const paired = rows.filter((r) => r.reference !== undefined);
  const reference = paired.length
    ? spec.aggregation === 'sum'
      ? paired.reduce((n, r) => n + r.reference!, 0)
      : paired.reduce((n, r) => n + r.reference!, 0) / paired.length
    : null;
  return {
    id,
    spec,
    rows,
    value,
    reference,
    numerator: rows.reduce((n, r) => n + r.numerator, 0),
    denominator: rows.reduce((n, r) => n + r.denominator, 0),
    state: movementConflict ? 'not-applicable' : value === null ? 'empty' : 'ready',
    scope: spec.dimensions.length
      ? spec.dimensions.map((d) => (filters[d] === 'all' ? 'All ' + d : filters[d])).join(' · ')
      : 'Airport-wide',
    asOf: AS_OF,
  };
}
export interface CategorySource {
  snapshot(
    category: CategoryId,
    filters: CategoryFilters,
    signal?: AbortSignal,
  ): Promise<CategorySnapshot>;
  details(id: KpiId, filters: CategoryFilters, signal?: AbortSignal): Promise<KpiResult>;
}
export const staticSource: CategorySource = {
  async snapshot(category, filters, signal) {
    signal?.throwIfAborted();
    return {
      category,
      asOf: AS_OF,
      version: FIXTURE_VERSION,
      metrics: categoryEntries(category).map((k) => calculate(k.id, filters)),
    };
  },
  async details(id, filters, signal) {
    signal?.throwIfAborted();
    return calculate(id, filters);
  },
};
export const SourceContext = createContext<CategorySource>(staticSource);
export function useCategoryData(category: CategoryId, filters: CategoryFilters) {
  const source = useContext(SourceContext);
  return useQuery({
    queryKey: ['category', 'meridian', FIXTURE_VERSION, category, filters],
    queryFn: ({ signal }) => source.snapshot(category, filters, signal),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
export function grouped(
  result: KpiResult,
  granularity: CategoryFilters['granularity'],
  by: 'time' | 'group' = 'time',
) {
  const size = granularity === 'quarter' ? 15 : granularity === 'hour' ? 60 : 1440;
  const groups = new Map<string, Observation[]>();
  for (const r of result.rows) {
    const label =
      by === 'group' ? r.label : String(Math.floor(Math.max(0, r.minute - 0.001) / size) * size);
    groups.set(label, [...(groups.get(label) ?? []), r]);
  }
  return [...groups].map(([label, rows]) => ({
    label:
      by === 'group'
        ? label
        : granularity === 'day'
          ? '17 Sep'
          : String(Math.floor(Number(label) / 60)).padStart(2, '0') +
            ':' +
            String(Number(label) % 60).padStart(2, '0'),
    value: aggregate(rows, result.spec),
    reference: rows.some((r) => r.reference !== undefined)
      ? result.spec.aggregation === 'sum'
        ? rows.reduce((n, r) => n + (r.reference ?? 0), 0)
        : rows.filter((r) => r.reference !== undefined).reduce((n, r) => n + r.reference!, 0) /
          rows.filter((r) => r.reference !== undefined).length
      : undefined,
    numerator: rows.reduce((n, r) => n + r.numerator, 0),
    denominator: rows.reduce((n, r) => n + r.denominator, 0),
  }));
}
