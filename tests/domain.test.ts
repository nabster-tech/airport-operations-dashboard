import { describe, expect, it } from 'vitest';
import { airport, defaultFilters } from '../src/config';
import { createMockData, mockData } from '../src/mockData';
import {
  flightStatus,
  midnightInZone,
  ratio,
  selectSnapshot,
  unionSeconds,
  waitTone,
  weightedMean,
  windowBounds,
} from '../src/data/selectors';
import { StaticTelemetrySource } from '../src/data/StaticTelemetrySource';
describe('KPI contracts', () => {
  it('weights means by sample count and distinguishes missing from zero', () => {
    expect(
      weightedMean([
        { value: 5, samples: 90 },
        { value: 25, samples: 10 },
      ]),
    ).toBe(7);
    expect(weightedMean([])).toBeNull();
    expect(ratio(0, 10)).toBe(0);
    expect(ratio(5, 0)).toBeNull();
  });
  it('handles threshold boundaries inclusively', () => {
    expect([9.99, 10, 20, 20.01].map(waitTone)).toEqual(['good', 'warning', 'warning', 'danger']);
  });
  it('anchors Today to airport midnight, including DST timezone offsets', () => {
    expect(new Date(midnightInZone(airport.asOf, 'Asia/Kolkata')).toISOString()).toBe(
      '2026-09-16T18:30:00.000Z',
    );
    expect(new Date(midnightInZone('2026-03-08T16:00:00Z', 'America/New_York')).toISOString()).toBe(
      '2026-03-08T05:00:00.000Z',
    );
    expect(
      windowBounds({ ...defaultFilters, range: 'hour' }, airport.asOf)[1] -
        windowBounds({ ...defaultFilters, range: 'hour' }, airport.asOf)[0],
    ).toBe(3_600_000);
  });
  it('merges overlapping occupancy intervals rather than double-counting', () => {
    const start = Date.parse('2026-09-17T00:00Z');
    expect(
      unionSeconds(
        [
          { start: '2026-09-17T00:00Z', end: '2026-09-17T00:05Z' },
          { start: '2026-09-17T00:03Z', end: '2026-09-17T00:08Z' },
        ],
        start,
        start + 600_000,
      ),
    ).toBe(480);
  });
  it('reproduces the same fixed 24-hour dataset', () => {
    expect(createMockData()).toEqual(mockData);
    expect(new Set(mockData.flows.map((r) => r.time)).size).toBe(96);
  });
  it('reconciles terminal totals and direction totals with the full snapshot', () => {
    const all = selectSnapshot(mockData, defaultFilters);
    const terminalTotal = (['t1', 't2', 'international'] as const).reduce(
      (sum, terminal) =>
        sum +
        (selectSnapshot(mockData, { ...defaultFilters, terminal }).widgets.throughput.value ?? 0),
      0,
    );
    const movementTotal = (['arrivals', 'departures'] as const).reduce(
      (sum, movement) =>
        sum +
        (selectSnapshot(mockData, { ...defaultFilters, movement }).widgets.throughput.value ?? 0),
      0,
    );
    expect(terminalTotal).toBe(all.widgets.throughput.value);
    expect(movementTotal).toBe(terminalTotal);
  });
  it('changes time-window aggregates without changing endpoint snapshots', () => {
    const day = selectSnapshot(mockData, defaultFilters),
      hour = selectSnapshot(mockData, { ...defaultFilters, range: 'hour' });
    expect(hour.widgets.throughput.value!).toBeLessThan(day.widgets.throughput.value!);
    expect(hour.widgets.gates).toEqual(day.widgets.gates);
    expect(hour.widgets.parking).toEqual(day.widgets.parking);
  });
  it('marks incompatible filters and keeps independent scopes unchanged', () => {
    const all = selectSnapshot(mockData, defaultFilters),
      arrivals = selectSnapshot(mockData, {
        ...defaultFilters,
        terminal: 't2',
        movement: 'arrivals',
      });
    expect(arrivals.widgets.security.state).toBe('not-applicable');
    expect(arrivals.widgets.checkin.state).toBe('not-applicable');
    expect(arrivals.widgets.runway.value).toBe(all.widgets.runway.value);
    expect(
      selectSnapshot(mockData, { ...defaultFilters, movement: 'departures' }).widgets.baggage.state,
    ).toBe('not-applicable');
    expect(
      selectSnapshot(mockData, { ...defaultFilters, movement: 'arrivals' }).widgets.revenue.value,
    ).toBe(all.widgets.revenue.value);
  });
  it('uses mutually exclusive flight status buckets and a completed OTP denominator', () => {
    const w = selectSnapshot(mockData, defaultFilters).widgets;
    const bucketSum = w.flights.data.rows.reduce(
      (s, r) => s + r.onTime + r.delayed + r.cancelled + r.unknown,
      0,
    );
    expect(bucketSum).toBe(w.flights.value);
    expect(w.otp.data.onTime + w.otp.data.late + w.otp.data.excluded).toBe(w.flights.value);
    expect(w.otp.value).toBeCloseTo(
      (w.otp.data.onTime / (w.otp.data.onTime + w.otp.data.late)) * 100,
    );
    const cancelled = mockData.flights.find((r) => r.cancelled)!;
    expect(flightStatus(cancelled, airport.asOf)).toBe('cancelled');
  });
  it('keeps capacity snapshots bounded and gate states exhaustive', () => {
    mockData.queues.forEach((r) => expect(r.count).toBeLessThanOrEqual(r.capacity));
    mockData.parking.forEach((r) => expect(r.occupied).toBeLessThanOrEqual(r.capacity));
    expect(new Set(mockData.gates.map((g) => g.id)).size).toBe(48);
    expect(
      mockData.gates.every((g) =>
        ['free', 'occupied', 'reserved', 'unavailable'].includes(g.status),
      ),
    ).toBe(true);
  });
  it('reconciles detail table values with the throughput card and rejects invalid filters', async () => {
    const source = new StaticTelemetrySource();
    const snapshot = await source.getSnapshot(defaultFilters);
    const detail = await source.getDetails('throughput', defaultFilters, 'group');
    expect(detail.rows.reduce((s, r) => s + Number(r[1]), 0)).toBe(
      snapshot.widgets.throughput.value,
    );
    await expect(
      source.getSnapshot({ ...defaultFilters, terminal: 'invalid' } as never),
    ).rejects.toThrow();
  });
  it('honors cancellation and returns a meaningful empty state', async () => {
    const source = new StaticTelemetrySource({ ...mockData, flows: [] });
    expect((await source.getSnapshot(defaultFilters)).widgets.throughput.state).toBe('empty');
    const controller = new AbortController();
    controller.abort();
    await expect(source.getSnapshot(defaultFilters, controller.signal)).rejects.toThrow();
  });
});
