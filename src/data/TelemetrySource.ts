import type { Details, Filters, Snapshot, WidgetId } from '../types';
export interface TelemetrySource {
  getSnapshot(filters: Filters, signal?: AbortSignal): Promise<Snapshot>;
  getDetails(
    id: WidgetId,
    filters: Filters,
    breakdown: 'default' | 'group',
    signal?: AbortSignal,
  ): Promise<Details>;
}
