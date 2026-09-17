import { z } from 'zod';
import { airport } from '../config';
import { definitions, minimumRows } from '../widgetRegistry';
import { widgetIds } from '../types';
import type { Breakpoint, GridCoordinates, LayoutDocument, WidgetId } from '../types';
export const STORAGE_KEY = 'airside.workspace.meridian.v1';
export const columnCounts: Record<Breakpoint, number> = { desktop: 12, tablet: 6, mobile: 1 };
export const breakpointFor = (width: number): Breakpoint =>
  width >= 1000 ? 'desktop' : width >= 620 ? 'tablet' : 'mobile';
export function pack(items: GridCoordinates[], cols: number): GridCoordinates[] {
  let x = 0,
    y = 0,
    rowHeight = 0;
  return items.map((item) => {
    const w = Math.min(item.w, cols);
    if (x + w > cols) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }
    const result = { ...item, x, y, w };
    x += w;
    rowHeight = Math.max(rowHeight, item.h);
    return result;
  });
}
export function defaultDocument(): LayoutDocument {
  const layouts = {} as LayoutDocument['layouts'];
  for (const breakpoint of ['desktop', 'tablet', 'mobile'] as const) {
    const cols = columnCounts[breakpoint];
    layouts[breakpoint] = pack(
      definitions.map((d) => ({
        i: d.id,
        x: 0,
        y: 0,
        w:
          breakpoint === 'mobile'
            ? 1
            : breakpoint === 'tablet'
              ? d.defaultWidth >= 6
                ? 6
                : 3
              : d.defaultWidth,
        h: d.defaultHeight,
        minW: breakpoint === 'mobile' ? 1 : 3,
        minH: minimumRows(d.id),
      })),
      cols,
    );
  }
  return {
    schemaVersion: 1,
    airportId: airport.id,
    layouts,
    hidden: [],
    settings: {},
    updatedAt: '',
  };
}
const itemSchema = z.object({
  i: z.string(),
  x: z.number().int().min(0),
  y: z.number().int().min(0).max(10000),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(7).max(24),
  minW: z.number().optional(),
  minH: z.number().optional(),
});
const schema = z.object({
  schemaVersion: z.literal(1),
  airportId: z.literal('meridian'),
  layouts: z.object({
    desktop: z.array(itemSchema),
    tablet: z.array(itemSchema),
    mobile: z.array(itemSchema),
  }),
  hidden: z.array(z.string()).default([]),
  settings: z
    .record(
      z.string(),
      z.object({
        display: z.enum(['chart', 'table']),
        density: z.enum(['comfortable', 'compact']),
      }),
    )
    .default({}),
  updatedAt: z.string().default(''),
});
const known = (id: string): id is WidgetId => widgetIds.includes(id as WidgetId);
export function overlaps(a: GridCoordinates, b: GridCoordinates) {
  return a.i !== b.i && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
export function parseDocument(input: unknown): LayoutDocument {
  const legacy = z
    .object({ schemaVersion: z.literal(0) })
    .passthrough()
    .safeParse(input);
  const parsed = schema.parse(legacy.success ? { ...legacy.data, schemaVersion: 1 } : input);
  const defaults = defaultDocument();
  const hidden = parsed.hidden.filter(known);
  const layouts = {} as LayoutDocument['layouts'];
  for (const breakpoint of ['desktop', 'tablet', 'mobile'] as const) {
    const cols = columnCounts[breakpoint];
    const items: GridCoordinates[] = parsed.layouts[breakpoint]
      .filter((r) => known(r.i))
      .map((r) => ({
        ...r,
        i: r.i as WidgetId,
        minW: breakpoint === 'mobile' ? 1 : 3,
        minH: minimumRows(r.i as WidgetId),
      }));
    if (new Set(items.map((r) => r.i)).size !== items.length)
      throw new Error('Duplicate widget positions.');
    if (
      items.some(
        (r) =>
          r.x + r.w > cols || r.w < (breakpoint === 'mobile' ? 1 : 3) || r.h < minimumRows(r.i),
      )
    )
      throw new Error('A widget is outside the grid.');
    const visible = items.filter((r) => !hidden.includes(r.i));
    if (visible.some((r, i) => visible.slice(i + 1).some((other) => overlaps(r, other))))
      throw new Error('Saved cards overlap.');
    let bottom = Math.max(0, ...items.map((r) => r.y + r.h));
    for (const item of defaults.layouts[breakpoint])
      if (!items.some((r) => r.i === item.i)) {
        items.push({ ...item, x: 0, y: bottom });
        bottom += item.h;
      }
    layouts[breakpoint] = items;
  }
  const settings = Object.fromEntries(Object.entries(parsed.settings).filter(([id]) => known(id)));
  return {
    schemaVersion: 1,
    airportId: airport.id,
    layouts,
    hidden: [...new Set(hidden)],
    settings,
    updatedAt: parsed.updatedAt,
  };
}
export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function loadDocument(storage?: PreferenceStorage): {
  document: LayoutDocument;
  notice: string;
} {
  try {
    if (!storage) return { document: defaultDocument(), notice: '' };
    const raw = storage.getItem(STORAGE_KEY);
    return { document: raw ? parseDocument(JSON.parse(raw)) : defaultDocument(), notice: '' };
  } catch {
    return {
      document: defaultDocument(),
      notice:
        'Saved preferences could not be read. A default layout is ready; save it to replace the unreadable copy.',
    };
  }
}
export function saveDocument(document: LayoutDocument, storage: PreferenceStorage): LayoutDocument {
  const validated = parseDocument({ ...document, updatedAt: new Date().toISOString() });
  storage.setItem(STORAGE_KEY, JSON.stringify(validated));
  return validated;
}
