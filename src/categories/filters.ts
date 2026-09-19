import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { categories, type CategoryId } from './catalog';
import { airport, storageKeys } from './airport';
import { defaultFilters, type CategoryFilters } from './models';

const filterSchema = z.object({
  range: z.enum(['today', 'six', 'hour']),
  terminal: z.enum(['all', 'T1', 'T2', 'International']),
  movement: z.enum(['all', 'arrivals', 'departures']),
  carrier: z.enum(['all', 'Meridian Air', 'Sky Jet', 'Aero Express']),
  runway: z.enum(['all', '09L/27R', '09R/27L']),
  resource: z.enum(['all', 'GPU', 'PBB', 'Follow-Me']),
  granularity: z.enum(['quarter', 'hour', 'day']),
});

const documentSchema = z.object({
  schemaVersion: z.literal(1),
  airportId: z.literal(airport.id),
  categories: z.record(z.string(), z.unknown()),
});

export type CategoryFilterMap = Partial<Record<CategoryId, CategoryFilters>>;

export function parseCategoryFilterDocument(value: unknown): CategoryFilterMap {
  const document = documentSchema.parse(value);
  const result: CategoryFilterMap = {};
  for (const category of categories) {
    const saved = document.categories[category.id];
    if (saved === undefined) continue;
    const parsed = filterSchema.safeParse(saved);
    if (parsed.success) result[category.id] = parsed.data;
  }
  return result;
}

function read(): CategoryFilterMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(storageKeys.filters);
    return raw ? parseCategoryFilterDocument(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

function persist(filters: CategoryFilterMap) {
  try {
    localStorage.setItem(
      storageKeys.filters,
      JSON.stringify({ schemaVersion: 1, airportId: airport.id, categories: filters }),
    );
  } catch {
    // The in-memory preference remains usable for this visit.
  }
}

export function useCategoryFilterPreferences() {
  const [filterMap, setFilterMap] = useState<CategoryFilterMap>(read);
  const filterMapRef = useRef(filterMap);

  useEffect(() => {
    const synchronize = (event: StorageEvent) => {
      if (event.key !== storageKeys.filters || event.newValue === null) return;
      try {
        const next = parseCategoryFilterDocument(JSON.parse(event.newValue));
        filterMapRef.current = next;
        setFilterMap(next);
      } catch {
        // Ignore malformed preferences written by another tab.
      }
    };
    window.addEventListener('storage', synchronize);
    return () => window.removeEventListener('storage', synchronize);
  }, []);

  const setCategoryFilters = useCallback(
    (
      category: CategoryId,
      update: CategoryFilters | ((current: CategoryFilters) => CategoryFilters),
    ) => {
      const previous = filterMapRef.current[category] ?? defaultFilters;
      const nextValue = typeof update === 'function' ? update(previous) : update;
      const next = {
        ...filterMapRef.current,
        [category]: filterSchema.parse(nextValue),
      };
      filterMapRef.current = next;
      setFilterMap(next);
      persist(next);
    },
    [],
  );

  return { filterMap, setCategoryFilters };
}
