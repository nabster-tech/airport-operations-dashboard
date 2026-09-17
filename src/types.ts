export const widgetIds = [
  'throughput',
  'security',
  'otp',
  'flights',
  'checkin',
  'baggage',
  'runway',
  'turnaround',
  'mishandling',
  'cargo',
  'parking',
  'revenue',
  'gates',
] as const;
export type WidgetId = (typeof widgetIds)[number];
export type Terminal = 't1' | 't2' | 'international';
export type Movement = 'arrivals' | 'departures';
export type TimeRange = 'hour' | 'six' | 'today';
export interface Filters {
  range: TimeRange;
  terminal: Terminal | 'all';
  movement: Movement | 'all';
}
export type Category = 'passenger' | 'airside' | 'logistics' | 'commercial';
export type Tone = 'good' | 'warning' | 'danger' | 'neutral';
export interface SeriesPoint {
  time: string;
  label: string;
  value: number;
  forecast?: number;
}
export interface BarRow {
  label: string;
  value: number;
  samples?: number;
  p95?: number;
  terminal?: Terminal;
  target?: number;
}
export interface SeriesPayload {
  kind: 'series';
  points: SeriesPoint[];
  forecastLabel?: string;
  area?: boolean;
  breakdown?: BarRow[];
}
export interface BarsPayload {
  kind: 'bars';
  rows: BarRow[];
  target?: number;
  thresholds?: boolean;
}
export interface QueueRow {
  terminal: Terminal;
  label: string;
  count: number;
  capacity: number;
  desks: number;
}
export interface QueuePayload {
  kind: 'queues';
  rows: QueueRow[];
}
export interface DonutPayload {
  kind: 'donut';
  onTime: number;
  late: number;
  excluded: number;
}
export interface FlightStatusRow {
  label: string;
  onTime: number;
  delayed: number;
  cancelled: number;
  unknown: number;
}
export interface FlightsPayload {
  kind: 'flights';
  rows: FlightStatusRow[];
  records: Flight[];
}
export interface RunwayPayload {
  kind: 'runway';
  points: SeriesPoint[];
  rows: BarRow[];
  usedSlots: number;
  allocatedSlots: number;
}
export interface CargoPayload {
  kind: 'cargo';
  rows: BarRow[];
  target: number;
}
export interface ParkingRow {
  terminal: Terminal;
  label: string;
  occupied: number;
  capacity: number;
}
export interface ParkingPayload {
  kind: 'parking';
  rows: ParkingRow[];
}
export interface RevenuePayload {
  kind: 'revenue';
  points: SeriesPoint[];
  rows: BarRow[];
}
export type GateStatus = 'free' | 'occupied' | 'reserved' | 'unavailable';
export interface Gate {
  id: string;
  terminal: Terminal;
  status: GateStatus;
  assignment: string;
}
export interface GatesPayload {
  kind: 'gates';
  rows: Gate[];
}
export interface PayloadMap {
  throughput: SeriesPayload;
  security: BarsPayload;
  otp: DonutPayload;
  flights: FlightsPayload;
  checkin: QueuePayload;
  baggage: BarsPayload;
  runway: RunwayPayload;
  turnaround: BarsPayload;
  mishandling: SeriesPayload;
  cargo: CargoPayload;
  parking: ParkingPayload;
  revenue: RevenuePayload;
  gates: GatesPayload;
}
export interface MetricBase {
  value: number | null;
  unit: string;
  subtitle: string;
  comparison: string;
  tone: Tone;
  scope: string;
  state: 'ready' | 'empty' | 'not-applicable';
}
export type Metric<K extends WidgetId> = MetricBase & { id: K; data: PayloadMap[K] };
export type WidgetModel = { [K in WidgetId]: Metric<K> }[WidgetId];
export interface Snapshot {
  asOf: string;
  revision: string;
  mode: 'static';
  widgets: { [K in WidgetId]: Metric<K> };
}
export interface Details {
  model: WidgetModel;
  columns: string[];
  rows: (string | number)[][];
}
export interface GridCoordinates {
  i: WidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}
export type Breakpoint = 'desktop' | 'tablet' | 'mobile';
export interface WidgetSettings {
  display: 'chart' | 'table';
  density: 'comfortable' | 'compact';
}
export interface LayoutDocument {
  schemaVersion: 1;
  airportId: string;
  layouts: Record<Breakpoint, GridCoordinates[]>;
  hidden: WidgetId[];
  settings: Partial<Record<WidgetId, WidgetSettings>>;
  updatedAt: string;
}
export interface FlowSample {
  time: string;
  terminal: Terminal;
  movement: Movement;
  passengers: number;
  forecast: number;
  incidents: number;
}
export interface SecuritySample {
  time: string;
  terminal: Terminal;
  checkpoint: string;
  wait: number;
  samples: number;
  p95: number;
}
export interface CommerceSample {
  time: string;
  terminal: Terminal;
  retail: number;
  dining: number;
}
export interface CargoSample {
  time: string;
  movement: Movement;
  category: string;
  tonnes: number;
  target: number;
}
export interface Flight {
  id: string;
  airline: string;
  aircraft: string;
  terminal: Terminal;
  movement: Movement;
  scheduled: string;
  actual: string | null;
  predictedDelay: number | null;
  cancelled: boolean;
  onBlock: string | null;
  firstBag: string | null;
  lastBag: string | null;
  belt: string;
}
export interface Occupancy {
  runway: string;
  start: string;
  end: string;
}
export interface Fixture {
  asOf: string;
  revision: string;
  flows: FlowSample[];
  security: SecuritySample[];
  commerce: CommerceSample[];
  cargo: CargoSample[];
  flights: Flight[];
  queues: QueueRow[];
  parking: ParkingRow[];
  gates: Gate[];
  occupancy: Occupancy[];
}
