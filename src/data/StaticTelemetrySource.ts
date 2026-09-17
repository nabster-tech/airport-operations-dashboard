import { z } from 'zod';
import { airport } from '../config';
import { mockData } from '../mockData';
import type { Details, Filters, Fixture, WidgetId, WidgetModel } from '../types';
import type { TelemetrySource } from './TelemetrySource';
import { aggregateBars, flightStatus, selectSnapshot, windowBounds } from './selectors';
export const filtersSchema = z.object({
  range: z.enum(['hour', 'six', 'today']),
  terminal: z.enum(['all', 't1', 't2', 'international']),
  movement: z.enum(['all', 'arrivals', 'departures']),
});
export function modelTable(model: WidgetModel): Pick<Details, 'columns' | 'rows'> {
  const d = model.data;
  if (model.state !== 'ready')
    return {
      columns: ['Status'],
      rows: [
        [
          model.state === 'not-applicable'
            ? 'This metric does not apply to the selected movement.'
            : 'No records match this selection.',
        ],
      ],
    };
  switch (d.kind) {
    case 'series':
      return {
        columns: d.forecastLabel
          ? ['Airport time', 'Actual', 'Forecast']
          : ['Airport time', 'Rate per 1,000'],
        rows: d.points.map((r) =>
          d.forecastLabel
            ? [r.label, r.value, r.forecast ?? 0]
            : [r.label, Number(r.value.toFixed(3))],
        ),
      };
    case 'bars':
      return {
        columns: ['Group', 'Minutes', 'Samples', ...(d.thresholds ? ['Highest interval p95'] : [])],
        rows: d.rows.map((r) => [
          r.label,
          Number(r.value.toFixed(1)),
          r.samples ?? 0,
          ...(d.thresholds ? [Number((r.p95 ?? 0).toFixed(1))] : []),
        ]),
      };
    case 'queues':
      return {
        columns: ['Terminal', 'Passengers', 'Capacity', 'Open desks'],
        rows: d.rows.map((r) => [r.label, r.count, r.capacity, r.desks]),
      };
    case 'donut':
      return {
        columns: ['Status', 'Movements'],
        rows: [
          ['On time', d.onTime],
          ['Late', d.late],
          ['Excluded / not yet completed', d.excluded],
        ],
      };
    case 'flights':
      return {
        columns: ['Flight', 'Direction', 'Terminal', 'Status'],
        rows: d.records.map((r) => [r.id, r.movement, r.terminal, flightStatus(r, airport.asOf)]),
      };
    case 'runway':
      return {
        columns: ['Runway', 'Occupancy %'],
        rows: [
          ...d.rows.map((r) => [r.label, Number(r.value.toFixed(1))]),
          ['Allocated slots used', d.usedSlots],
          ['Allocated slots total', d.allocatedSlots],
        ],
      };
    case 'cargo':
      return {
        columns: ['Cargo category', 'Metric tonnes'],
        rows: d.rows.map((r) => [r.label, Number(r.value.toFixed(2))]),
      };
    case 'parking':
      return {
        columns: ['Garage', 'Occupied', 'Capacity', 'Available'],
        rows: d.rows.map((r) => [r.label, r.occupied, r.capacity, r.capacity - r.occupied]),
      };
    case 'revenue':
      return {
        columns: ['Category', 'Net sales (INR)'],
        rows: d.rows.map((r) => [r.label, r.value]),
      };
    case 'gates':
      return {
        columns: ['Gate', 'Terminal', 'Status', 'Assignment'],
        rows: d.rows.map((r) => [r.id, r.terminal, r.status, r.assignment]),
      };
  }
}
export class StaticTelemetrySource implements TelemetrySource {
  constructor(private readonly fixture: Fixture = mockData) {}
  async getSnapshot(filters: Filters, signal?: AbortSignal) {
    signal?.throwIfAborted();
    return selectSnapshot(this.fixture, filtersSchema.parse(filters));
  }
  async getDetails(
    id: WidgetId,
    filters: Filters,
    breakdown: 'default' | 'group' = 'default',
    signal?: AbortSignal,
  ): Promise<Details> {
    const snapshot = await this.getSnapshot(filters, signal);
    let model: WidgetModel = snapshot.widgets[id];
    if (breakdown === 'group' && model.state === 'ready') {
      if (model.data.kind === 'bars' && (id === 'security' || id === 'baggage'))
        model = {
          ...model,
          data: { ...model.data, rows: aggregateBars(model.data.rows) },
        } as WidgetModel;
      if (id === 'throughput') {
        const rows = snapshot.widgets.throughput.data.breakdown ?? [];
        return {
          model,
          columns: ['Terminal', 'Passenger movements'],
          rows: rows.map((r) => [r.label, r.value]),
        };
      }
      if (id === 'turnaround') {
        const [start, end] = windowBounds(filters, this.fixture.asOf);
        const turns = this.fixture.flights.filter(
          (r) =>
            r.movement === 'departures' &&
            !r.cancelled &&
            r.actual &&
            r.onBlock &&
            Date.parse(r.actual) > start &&
            Date.parse(r.actual) <= end &&
            (filters.terminal === 'all' || filters.terminal === r.terminal),
        );
        const rows = [...new Set(turns.map((r) => r.aircraft))].map((label) => {
          const rs = turns.filter((r) => r.aircraft === label);
          return {
            label,
            value:
              rs.reduce(
                (s, r) => s + (Date.parse(r.actual!) - Date.parse(r.onBlock!)) / 60_000,
                0,
              ) / rs.length,
            samples: rs.length,
            target: 45,
          };
        });
        model = { ...snapshot.widgets.turnaround, data: { kind: 'bars', rows, target: 45 } };
      }
    }
    signal?.throwIfAborted();
    return { model, ...modelTable(model) };
  }
}
export const telemetrySource: TelemetrySource = new StaticTelemetrySource();
