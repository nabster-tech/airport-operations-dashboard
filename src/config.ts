import type { Filters, Terminal } from './types';
export const airport = {
  id: 'meridian',
  name: 'Meridian International',
  code: 'MDI',
  city: 'Meridian',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  asOf: '2026-09-17T08:30:00.000Z',
  otpTolerance: 15,
  baggageTarget: 20,
  turnaroundTarget: 45,
} as const;
export const terminals: Record<Terminal, string> = {
  t1: 'Terminal 1',
  t2: 'Terminal 2',
  international: 'International',
};
export const defaultFilters: Filters = { range: 'today', terminal: 'all', movement: 'all' };
export const rangeLabels = { hour: 'Last hour', six: 'Last 6 hours', today: 'Today' };
export const colors = {
  teal: '#55d9bd',
  blue: '#84a9ff',
  amber: '#f5be69',
  red: '#ff8795',
  muted: '#94a3b8',
  grid: '#243043',
};
export const number = (value: number, decimals = 0) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
export const compact = (value: number) =>
  new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
export const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: airport.currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
export const timeLabel = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: airport.timezone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
export const snapshotLabel = new Intl.DateTimeFormat('en-GB', {
  timeZone: airport.timezone,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(airport.asOf));
