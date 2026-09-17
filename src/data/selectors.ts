import { airport, number, terminals, timeLabel } from '../config';
import type {
  BarRow,
  Filters,
  Flight,
  Fixture,
  Metric,
  MetricBase,
  PayloadMap,
  SeriesPoint,
  Snapshot,
  Tone,
  WidgetId,
} from '../types';

export function midnightInZone(reference: string, zone: string): number {
  const parts = (stamp: number) =>
    Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(new Date(stamp))
        .map((p) => [p.type, p.value]),
    );
  const p = parts(Date.parse(reference));
  const utcMidnight = Date.UTC(+p.year, +p.month - 1, +p.day);
  let candidate = utcMidnight;
  for (let i = 0; i < 3; i++) {
    const z = parts(candidate);
    const represented = Date.UTC(+z.year, +z.month - 1, +z.day, +z.hour, +z.minute, +z.second);
    candidate = utcMidnight - (represented - candidate);
  }
  return candidate;
}
export function windowBounds(
  filters: Filters,
  asOf: string,
  zone: string = airport.timezone,
): [number, number] {
  const end = Date.parse(asOf);
  return [
    filters.range === 'today'
      ? midnightInZone(asOf, zone)
      : end - (filters.range === 'hour' ? 1 : 6) * 3_600_000,
    end,
  ];
}
export const ratio = (a: number, b: number, scale = 100) => (b > 0 ? (a / b) * scale : null);
export const weightedMean = (rows: { value: number; samples?: number }[]) => {
  const count = rows.reduce((s, r) => s + (r.samples ?? 1), 0);
  return count ? rows.reduce((s, r) => s + r.value * (r.samples ?? 1), 0) / count : null;
};
export const waitTone = (minutes: number): Tone =>
  minutes < 10 ? 'good' : minutes <= 20 ? 'warning' : 'danger';
export function unionSeconds(
  intervals: { start: string; end: string }[],
  start: number,
  end: number,
): number {
  const spans = intervals
    .map((i) => [Math.max(start, Date.parse(i.start)), Math.min(end, Date.parse(i.end))])
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let right = start;
  for (const [s, e] of spans) {
    if (e > right) {
      total += e - Math.max(s, right);
      right = e;
    }
  }
  return total / 1000;
}
export function flightStatus(
  f: Flight,
  asOf: string,
): 'onTime' | 'delayed' | 'cancelled' | 'unknown' {
  if (f.cancelled) return 'cancelled';
  const completed = f.actual && Date.parse(f.actual) <= Date.parse(asOf);
  const delay = completed
    ? (Date.parse(f.actual!) - Date.parse(f.scheduled)) / 60_000
    : f.predictedDelay;
  return delay === null ? 'unknown' : delay > airport.otpTolerance ? 'delayed' : 'onTime';
}
const sum = <T>(rows: T[], read: (r: T) => number) => rows.reduce((s, r) => s + read(r), 0);
export function aggregateBars(rows: BarRow[]): BarRow[] {
  const groups = new Map<string, BarRow[]>();
  rows.forEach((r) => {
    const key = r.terminal ? terminals[r.terminal] : r.label;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  });
  return [...groups].map(([label, r]) => ({
    label,
    value: weightedMean(r) ?? 0,
    samples: sum(r, (x) => x.samples ?? 1),
    p95: Math.max(...r.map((x) => x.p95 ?? x.value)),
    target: r[0].target,
  }));
}
export function selectSnapshot(fixture: Fixture, filters: Filters): Snapshot {
  const [start, end] = windowBounds(filters, fixture.asOf);
  const inWindow = (time: string) => Date.parse(time) > start && Date.parse(time) <= end;
  const terminalMatch = (r: { terminal: string }) =>
    filters.terminal === 'all' || r.terminal === filters.terminal;
  const directionMatch = (r: { movement: string }) =>
    filters.movement === 'all' || r.movement === filters.movement;
  const terminalScope = filters.terminal === 'all' ? 'All terminals' : terminals[filters.terminal];
  const scope =
    terminalScope + ' · ' + (filters.movement === 'all' ? 'all movements' : filters.movement);
  const flow = fixture.flows.filter(
    (r) => inWindow(r.time) && terminalMatch(r) && directionMatch(r),
  );
  const passengers = sum(flow, (r) => r.passengers),
    forecast = sum(flow, (r) => r.forecast);
  const pointsByTime = new Map<string, typeof flow>();
  flow.forEach((r) => pointsByTime.set(r.time, [...(pointsByTime.get(r.time) ?? []), r]));
  const points: SeriesPoint[] = [...pointsByTime].map(([time, rs]) => ({
    time,
    label: timeLabel(time),
    value: sum(rs, (r) => r.passengers),
    forecast: sum(rs, (r) => r.forecast),
  }));
  const throughputRows = Object.entries(terminals)
    .filter(([t]) => filters.terminal === 'all' || t === filters.terminal)
    .map(([t, label]) => ({
      label,
      value: sum(
        flow.filter((r) => r.terminal === t),
        (r) => r.passengers,
      ),
    }));
  const make = <K extends WidgetId>(
    id: K,
    data: PayloadMap[K],
    value: number | null,
    unit: string,
    subtitle: string,
    comparison: string,
    tone: Tone,
    filterScope: string = scope,
    state?: MetricBase['state'],
  ): Metric<K> => ({
    id,
    data,
    value,
    unit,
    subtitle,
    comparison,
    tone,
    scope: filterScope,
    state: state ?? (value === null ? 'empty' : 'ready'),
  });
  const waits = fixture.security.filter((r) => inWindow(r.time) && terminalMatch(r));
  const checkpointNames = [...new Set(waits.map((r) => r.checkpoint))];
  const securityRows = checkpointNames.map((label) => {
    const rows = waits.filter((r) => r.checkpoint === label);
    return {
      label,
      terminal: rows[0].terminal,
      value: weightedMean(rows.map((r) => ({ value: r.wait, samples: r.samples }))) ?? 0,
      samples: sum(rows, (r) => r.samples),
      p95: Math.max(...rows.map((r) => r.p95)),
    };
  });
  const wait = weightedMean(securityRows);
  const scheduledFlights = fixture.flights.filter(
    (r) => inWindow(r.scheduled) && terminalMatch(r) && directionMatch(r),
  );
  const completed = scheduledFlights.filter(
    (r) => !r.cancelled && r.actual && Date.parse(r.actual) <= end,
  );
  const onTime = completed.filter((r) => flightStatus(r, fixture.asOf) === 'onTime').length;
  const eligibleRows = fixture.flights.filter(
    (r) => terminalMatch(r) && !r.cancelled && r.actual && Date.parse(r.actual) <= end,
  );
  const flightRows = (['arrivals', 'departures'] as const)
    .filter((m) => filters.movement === 'all' || m === filters.movement)
    .map((m) => {
      const rows = scheduledFlights.filter((r) => r.movement === m);
      return {
        label: m === 'arrivals' ? 'Arrivals' : 'Departures',
        onTime: rows.filter((r) => flightStatus(r, fixture.asOf) === 'onTime').length,
        delayed: rows.filter((r) => flightStatus(r, fixture.asOf) === 'delayed').length,
        cancelled: rows.filter((r) => r.cancelled).length,
        unknown: rows.filter((r) => flightStatus(r, fixture.asOf) === 'unknown').length,
      };
    });
  const queues = fixture.queues.filter(terminalMatch);
  const queueRatio = ratio(
    sum(queues, (r) => r.count),
    sum(queues, (r) => r.capacity),
  );
  const delivered = eligibleRows.filter(
    (r) => r.movement === 'arrivals' && r.firstBag && r.lastBag && inWindow(r.lastBag),
  );
  const beltNames = [...new Set(delivered.map((r) => r.belt))];
  const baggageRows = beltNames.map((label) => {
    const rows = delivered.filter((r) => r.belt === label);
    return {
      label,
      terminal: rows[0].terminal,
      value:
        sum(rows, (r) => (Date.parse(r.lastBag!) - Date.parse(r.firstBag!)) / 60_000) / rows.length,
      samples: rows.length,
      target: airport.baggageTarget,
    };
  });
  const baggageMean = weightedMean(baggageRows);
  const turns = eligibleRows.filter(
    (r) => r.movement === 'departures' && r.onBlock && r.actual && inWindow(r.actual),
  );
  const turnaroundRows = [...new Set(turns.map((r) => r.airline))].map((label) => {
    const rows = turns.filter((r) => r.airline === label);
    return {
      label,
      value:
        sum(rows, (r) => (Date.parse(r.actual!) - Date.parse(r.onBlock!)) / 60_000) / rows.length,
      samples: rows.length,
      target: airport.turnaroundTarget,
    };
  });
  const turnMean = weightedMean(turnaroundRows);
  const runwayNames = [...new Set(fixture.occupancy.map((r) => r.runway))];
  const runwayRows = runwayNames.map((label) => ({
    label,
    value:
      (unionSeconds(
        fixture.occupancy.filter((r) => r.runway === label),
        start,
        end,
      ) /
        ((end - start) / 1000)) *
      100,
  }));
  const runwayPoints: SeriesPoint[] = [];
  for (let time = start + 15 * 60_000; time <= end; time += 15 * 60_000)
    runwayPoints.push({
      time: new Date(time).toISOString(),
      label: timeLabel(new Date(time).toISOString()),
      value:
        (sum(runwayNames, (r) =>
          unionSeconds(
            fixture.occupancy.filter((o) => o.runway === r),
            time - 15 * 60_000,
            time,
          ),
        ) /
          (15 * 60 * runwayNames.length)) *
        100,
    });
  const usedSlots = fixture.occupancy.filter(
    (r) => Date.parse(r.start) >= start && Date.parse(r.start) < end,
  ).length;
  const allocatedSlots = Math.ceil((end - start) / (15 * 60_000)) * 3;
  const incidents = sum(flow, (r) => r.incidents);
  const incidentPoints = [...pointsByTime].map(([time, rs]) => ({
    time,
    label: timeLabel(time),
    value:
      ratio(
        sum(rs, (r) => r.incidents),
        sum(rs, (r) => r.passengers),
        1000,
      ) ?? 0,
  }));
  const cargo = fixture.cargo.filter((r) => inWindow(r.time) && directionMatch(r));
  const cargoRows = [...new Set(cargo.map((r) => r.category))].map((label) => ({
    label,
    value: sum(
      cargo.filter((r) => r.category === label),
      (r) => r.tonnes,
    ),
  }));
  const cargoValue = sum(cargo, (r) => r.tonnes),
    cargoTarget = sum(cargo, (r) => r.target);
  const parking = fixture.parking.filter(terminalMatch);
  const parkingPercent = ratio(
    sum(parking, (r) => r.occupied),
    sum(parking, (r) => r.capacity),
  );
  const sales = fixture.commerce.filter((r) => inWindow(r.time) && terminalMatch(r));
  const salesTimes = [...new Set(sales.map((r) => r.time))];
  const revenuePoints = salesTimes.map((time) => ({
    time,
    label: timeLabel(time),
    value: sum(
      sales.filter((r) => r.time === time),
      (r) => r.retail + r.dining,
    ),
  }));
  const retail = sum(sales, (r) => r.retail),
    dining = sum(sales, (r) => r.dining);
  const gates = fixture.gates.filter(terminalMatch);
  const free = gates.filter((r) => r.status === 'free').length;
  const otp = ratio(onTime, completed.length);
  return {
    asOf: fixture.asOf,
    revision: fixture.revision,
    mode: 'static',
    widgets: {
      throughput: make(
        'throughput',
        {
          kind: 'series',
          points,
          forecastLabel: 'Forecast',
          area: true,
          breakdown: throughputRows,
        },
        flow.length ? passengers : null,
        'pax',
        'passenger movements',
        forecast ? number((passengers / forecast - 1) * 100, 1) + '% vs forecast' : 'No forecast',
        passengers >= forecast ? 'good' : 'neutral',
      ),
      security: make(
        'security',
        { kind: 'bars', rows: securityRows, thresholds: true },
        filters.movement === 'arrivals' ? null : wait,
        'min',
        'average checkpoint wait',
        wait !== null
          ? wait > 20
            ? 'Above 20 min threshold'
            : wait >= 10
              ? 'Elevated queues'
              : 'Within 10 min threshold'
          : 'No samples',
        waitTone(wait ?? 0),
        terminalScope + ' · departures',
        filters.movement === 'arrivals' ? 'not-applicable' : undefined,
      ),
      otp: make(
        'otp',
        {
          kind: 'donut',
          onTime,
          late: completed.length - onTime,
          excluded: scheduledFlights.length - completed.length,
        },
        otp,
        '%',
        'completed movements on schedule',
        completed.length
          ? number(onTime) + ' of ' + number(completed.length) + ' eligible'
          : 'No eligible movements',
        (otp ?? 0) >= 85 ? 'good' : 'warning',
      ),
      flights: make(
        'flights',
        { kind: 'flights', rows: flightRows, records: scheduledFlights },
        scheduledFlights.length,
        'flights',
        'scheduled movements',
        sum(flightRows, (r) => r.delayed) +
          ' delayed · ' +
          sum(flightRows, (r) => r.cancelled) +
          ' cancelled',
        sum(flightRows, (r) => r.delayed) ? 'warning' : 'good',
      ),
      checkin: make(
        'checkin',
        { kind: 'queues', rows: queues },
        filters.movement === 'arrivals' ? null : queueRatio,
        '%',
        'of queue capacity occupied',
        sum(queues, (r) => r.count) + ' passengers in queue',
        (queueRatio ?? 0) >= 80 ? 'warning' : 'good',
        terminalScope + ' · departures · snapshot',
        filters.movement === 'arrivals' ? 'not-applicable' : undefined,
      ),
      baggage: make(
        'baggage',
        { kind: 'bars', rows: baggageRows, target: 20 },
        filters.movement === 'departures' ? null : baggageMean,
        'min',
        'first to last bag',
        baggageMean !== null
          ? (baggageMean <= 20 ? 'Within' : 'Above') + ' 20 min target'
          : 'No completed deliveries',
        (baggageMean ?? 0) > 20 ? 'warning' : 'good',
        terminalScope + ' · arrivals',
        filters.movement === 'departures' ? 'not-applicable' : undefined,
      ),
      runway: make(
        'runway',
        { kind: 'runway', rows: runwayRows, points: runwayPoints, usedSlots, allocatedSlots },
        weightedMean(runwayRows),
        '%',
        'runway occupancy',
        number(ratio(usedSlots, allocatedSlots) ?? 0, 1) + '% of allocated slots used',
        'neutral',
        'Airport-wide · all movements',
      ),
      turnaround: make(
        'turnaround',
        { kind: 'bars', rows: turnaroundRows, target: 45 },
        turnMean,
        'min',
        'average ground time',
        turns.length + ' completed aircraft turns',
        (turnMean ?? 0) > 45 ? 'warning' : 'good',
        terminalScope + ' · paired turns',
      ),
      mishandling: make(
        'mishandling',
        { kind: 'series', points: incidentPoints },
        ratio(incidents, passengers, 1000),
        '/ 1k',
        'incidents per 1,000 passengers',
        incidents + ' incidents · reporting-window proxy',
        'neutral',
      ),
      cargo: make(
        'cargo',
        { kind: 'cargo', rows: cargoRows, target: cargoTarget },
        cargo.length ? cargoValue : null,
        't',
        'cargo processed',
        number(ratio(cargoValue, cargoTarget) ?? 0, 1) + '% of window target',
        'neutral',
        'Airport-wide · ' +
          (filters.movement === 'all'
            ? 'inbound + outbound'
            : filters.movement === 'arrivals'
              ? 'inbound'
              : 'outbound'),
      ),
      parking: make(
        'parking',
        { kind: 'parking', rows: parking },
        parkingPercent,
        '%',
        'parking capacity occupied',
        number(sum(parking, (r) => r.capacity - r.occupied)) + ' spaces available',
        'good',
        terminalScope + ' · snapshot · all movements',
      ),
      revenue: make(
        'revenue',
        {
          kind: 'revenue',
          points: revenuePoints,
          rows: [
            { label: 'Retail', value: retail },
            { label: 'Dining', value: dining },
          ],
        },
        sales.length ? retail + dining : null,
        'INR',
        'net concession sales',
        number(ratio(dining, retail + dining) ?? 0) + '% dining share',
        'neutral',
        terminalScope + ' · all movements',
      ),
      gates: make(
        'gates',
        { kind: 'gates', rows: gates },
        free,
        'free',
        'gates ready for allocation',
        gates.length +
          ' total · ' +
          gates.filter((r) => r.status === 'occupied').length +
          ' occupied',
        'good',
        terminalScope + ' · snapshot · all movements',
      ),
    },
  };
}
