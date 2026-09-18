import type { CategoryId, KpiId } from './catalog';
export type Dimension = 'terminal' | 'movement' | 'carrier' | 'runway' | 'resource';
export interface CategoryFilters {
  range: 'today' | 'six' | 'hour';
  terminal: string;
  movement: string;
  carrier: string;
  runway: string;
  resource: string;
  granularity: 'quarter' | 'hour' | 'day';
}
export const defaultFilters: CategoryFilters = {
  range: 'today',
  terminal: 'all',
  movement: 'all',
  carrier: 'all',
  runway: 'all',
  resource: 'all',
  granularity: 'hour',
};
export const AS_OF = '2026-09-17T14:00:00+05:30';
export const FIXTURE_VERSION = 'category-demo-v2';
export const dimensionLabels: Record<Dimension, string> = {
  terminal: 'Terminal',
  movement: 'Movement',
  carrier: 'Carrier',
  runway: 'Runway',
  resource: 'Resource',
};
export const options: Record<Dimension, readonly string[]> = {
  terminal: ['T1', 'T2', 'International'],
  movement: ['arrivals', 'departures'],
  carrier: ['Meridian Air', 'Sky Jet', 'Aero Express'],
  runway: ['09L/27R', '09R/27L'],
  resource: ['GPU', 'PBB', 'Follow-Me'],
};
export interface Scope {
  terminal?: string;
  movement?: string;
  carrier?: string;
  runway?: string;
  resource?: string;
}
export interface Observation extends Scope {
  id: string;
  minute: number;
  label: string;
  numerator: number;
  denominator: number;
  reference?: number;
  note?: string;
}
export type Aggregation = 'mean' | 'percent' | 'sum' | 'count' | 'rate';
export interface MetricSpec {
  unit: string;
  aggregation: Aggregation;
  formula: string;
  source: string;
  dimensions: Dimension[];
  scale?: number;
  target?: number;
  higherBetter?: boolean;
  pairLabel?: string;
  kind?: 'events' | 'report' | 'scenario';
}
export interface KpiResult {
  id: KpiId;
  value: number | null;
  reference: number | null;
  numerator: number;
  denominator: number;
  state: 'ready' | 'empty' | 'not-applicable';
  rows: Observation[];
  spec: MetricSpec;
  scope: string;
  asOf: string;
}
export interface CategorySnapshot {
  category: CategoryId;
  asOf: string;
  version: string;
  metrics: KpiResult[];
}
export function timeLabel(minute: number) {
  return (
    String(Math.floor(minute / 60)).padStart(2, '0') +
    ':' +
    String(Math.floor(minute % 60)).padStart(2, '0')
  );
}
export function windowStart(range: CategoryFilters['range']) {
  return range === 'hour' ? 780 : range === 'six' ? 480 : 0;
}
