import { useQuery } from '@tanstack/react-query';
import type { Filters, WidgetId } from '../types';
import { telemetrySource } from './StaticTelemetrySource';
export const snapshotKey = (filters: Filters) => ['airport-snapshot', 'meridian', filters] as const;
export function useTelemetry(filters: Filters) {
  return useQuery({
    queryKey: snapshotKey(filters),
    queryFn: ({ signal }) => telemetrySource.getSnapshot(filters, signal),
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
export function useDetails(id: WidgetId, filters: Filters, breakdown: 'default' | 'group') {
  return useQuery({
    queryKey: ['airport-details', 'meridian', id, filters, breakdown],
    queryFn: ({ signal }) => telemetrySource.getDetails(id, filters, breakdown, signal),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
