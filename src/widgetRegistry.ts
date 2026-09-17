import {
  Users,
  ShieldCheck,
  CircleGauge,
  Plane,
  TicketCheck,
  Luggage,
  Route,
  Timer,
  BaggageClaim,
  Package,
  Car,
  ShoppingBag,
  DoorOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Category, WidgetId } from './types';
export interface Definition {
  id: WidgetId;
  title: string;
  category: Category;
  icon: LucideIcon;
  description: string;
  source: string;
  groupLabel?: string;
  defaultWidth: number;
  defaultHeight: number;
}
export const definitions: Definition[] = [
  {
    id: 'throughput',
    title: 'Passenger throughput',
    category: 'passenger',
    icon: Users,
    description:
      'Passenger movements processed in the selected window, compared with a forecast for the same intervals. Transfers can count as multiple movements.',
    source: 'Terminal passenger counts',
    groupLabel: 'Terminal',
    defaultWidth: 6,
    defaultHeight: 9,
  },
  {
    id: 'security',
    title: 'Security wait times',
    category: 'passenger',
    icon: ShieldCheck,
    description:
      'Sample-weighted mean wait per checkpoint. Clear: below 10 min. Elevated: 10–20 min inclusive. Congested: above 20 min. The p95 column is the highest interval p95, not an aggregate percentile.',
    source: 'Checkpoint queue samples',
    groupLabel: 'Terminal',
    defaultWidth: 3,
    defaultHeight: 9,
  },
  {
    id: 'otp',
    title: 'On-time performance',
    category: 'airside',
    icon: CircleGauge,
    description:
      'Completed movements with actual arrival in-block or departure off-block no more than 15 min after schedule, divided by all completed movements with valid times. Cancellations and pending/missing actual times are excluded.',
    source: 'Flight movement records',
    defaultWidth: 3,
    defaultHeight: 9,
  },
  {
    id: 'flights',
    title: 'Flight operations',
    category: 'airside',
    icon: Plane,
    description:
      'Scheduled movements in the selected window. Directions are split into mutually exclusive on-time, delayed, cancelled and unknown buckets. Pending movements use predicted delay; completed movements use actual delay.',
    source: 'Flight movement records',
    defaultWidth: 4,
    defaultHeight: 9,
  },
  {
    id: 'checkin',
    title: 'Check-in queue density',
    category: 'passenger',
    icon: TicketCheck,
    description:
      'Latest queued passengers divided by configured queue capacity at the dataset endpoint. This is a snapshot; changing the historical window does not change current occupancy.',
    source: 'Check-in queue snapshot',
    defaultWidth: 4,
    defaultHeight: 9,
  },
  {
    id: 'baggage',
    title: 'Baggage delivery',
    category: 'passenger',
    icon: Luggage,
    description:
      'Sample-weighted mean minutes from first bag to last bag for deliveries completed in the selected window. Target: 20 min. This is not arrival-to-first-bag time.',
    source: 'Completed baggage belt deliveries',
    groupLabel: 'Terminal',
    defaultWidth: 4,
    defaultHeight: 9,
  },
  {
    id: 'runway',
    title: 'Runway utilization',
    category: 'airside',
    icon: Route,
    description:
      'Union of occupied seconds divided by available seconds across two runways. Airport-wide physical occupancy ignores terminal and movement filters. Slots used is separately measured against allocated slots.',
    source: 'Runway occupancy intervals',
    defaultWidth: 6,
    defaultHeight: 8,
  },
  {
    id: 'turnaround',
    title: 'Aircraft turnaround',
    category: 'airside',
    icon: Timer,
    description:
      'Mean elapsed ground time from on-block to off-block for completed paired aircraft turns, assigned to departure terminal and actual off-block window. Target: 45 min. Movement direction does not apply.',
    source: 'Completed turn milestones',
    groupLabel: 'Aircraft type',
    defaultWidth: 6,
    defaultHeight: 8,
  },
  {
    id: 'mishandling',
    title: 'Baggage mishandling',
    category: 'logistics',
    icon: BaggageClaim,
    description:
      'Lost/delayed bag incidents recorded in the window per 1,000 passenger movements in the same reporting window. A reporting-window proxy: incidents may relate to earlier travel.',
    source: 'Attributed baggage incident reports',
    defaultWidth: 4,
    defaultHeight: 9,
  },
  {
    id: 'cargo',
    title: 'Cargo throughput',
    category: 'logistics',
    icon: Package,
    description:
      'Processed metric tonnes compared with the summed target for the selected intervals. Airport-wide cargo facility; direction maps to inbound/outbound.',
    source: 'Cargo handling totals',
    defaultWidth: 4,
    defaultHeight: 9,
  },
  {
    id: 'parking',
    title: 'Parking occupancy',
    category: 'commercial',
    icon: Car,
    description:
      'Latest occupied spaces divided by open capacity, weighted across selected garages. Garages map to terminals. Physical capacity is independent of movement direction.',
    source: 'Garage capacity snapshot',
    defaultWidth: 4,
    defaultHeight: 9,
  },
  {
    id: 'revenue',
    title: 'Retail & dining revenue',
    category: 'commercial',
    icon: ShoppingBag,
    description:
      'Net sales excluding tax and after refunds, in INR, summed for the selected reporting intervals and terminals. Movement direction does not apply.',
    source: 'Aggregated concession sales',
    defaultWidth: 6,
    defaultHeight: 10,
  },
  {
    id: 'gates',
    title: 'Gate availability',
    category: 'airside',
    icon: DoorOpen,
    description:
      'Latest gate states: free, occupied, reserved or unavailable. Every gate is in exactly one state. Snapshot at the dataset endpoint; movement direction does not apply.',
    source: 'Gate allocation snapshot',
    defaultWidth: 6,
    defaultHeight: 10,
  },
];
export const minimumRows = (id: WidgetId) =>
  id === 'gates' ? 10 : ['flights', 'checkin', 'baggage', 'parking'].includes(id) ? 9 : 7;
export const registry = Object.fromEntries(definitions.map((d) => [d.id, d])) as Record<
  WidgetId,
  Definition
>;
export const categories: { id: Category; label: string; short: string; icon: LucideIcon }[] = [
  { id: 'passenger', label: 'Passenger & terminal', short: 'Terminal flow', icon: Users },
  { id: 'airside', label: 'Flight operations', short: 'Airside', icon: Plane },
  { id: 'logistics', label: 'Baggage & logistics', short: 'Logistics', icon: Package },
  { id: 'commercial', label: 'Facilities & commercial', short: 'Facilities', icon: ShoppingBag },
];
