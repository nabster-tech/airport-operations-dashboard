import { create } from 'zustand';
import { z } from 'zod';
import { categories, categoryEntries, type CategoryId, type KpiId } from './catalog';
import { airport, storageKeys } from './airport';
export type Breakpoint = 'desktop' | 'tablet' | 'mobile';
export interface Position {
  i: KpiId;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
  maxH: number;
}
export interface CategoryLayout {
  layouts: Record<Breakpoint, Position[]>;
  hidden: KpiId[];
  tables: KpiId[];
}
export const STORAGE_KEY = storageKeys.layouts;
export const cols: Record<Breakpoint, number> = { desktop: 12, tablet: 6, mobile: 1 };
export function pack(items: Position[], columns: number) {
  let x = 0,
    y = 0,
    height = 0;
  return items.map((r) => {
    const w = Math.min(columns, r.w);
    if (x + w > columns) {
      x = 0;
      y += height;
      height = 0;
    }
    const item = { ...r, x, y, w };
    x += w;
    height = Math.max(height, r.h);
    return item;
  });
}
export function defaults(category: CategoryId): CategoryLayout {
  const layouts = {} as CategoryLayout['layouts'];
  for (const bp of ['desktop', 'tablet', 'mobile'] as const)
    layouts[bp] = pack(
      categoryEntries(category).map((k, i) => ({
        i: k.id,
        x: 0,
        y: 0,
        w: bp === 'mobile' ? 1 : bp === 'tablet' ? 3 : i === 0 ? 6 : 3,
        h: 9,
        minW: bp === 'mobile' ? 1 : 3,
        minH: 8,
        maxH: 24,
      })),
      cols[bp],
    );
  return { layouts, hidden: [], tables: [] };
}
const position = z.object({
  i: z.string(),
  x: z.number().int().min(0),
  y: z.number().int().min(0).max(10000),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(8).max(24),
});
const schema = z.object({
  layouts: z.object({
    desktop: z.array(position),
    tablet: z.array(position),
    mobile: z.array(position),
  }),
  hidden: z.array(z.string()),
  tables: z.array(z.string()),
});
export function validate(category: CategoryId, value: unknown): CategoryLayout {
  const parsed = schema.parse(value),
    base = defaults(category);
  const ids = categoryEntries(category).map((k) => k.id);
  const isKnown = (id: string): id is KpiId => ids.includes(id as KpiId);
  base.hidden = [...new Set(parsed.hidden.filter(isKnown))];
  base.tables = [...new Set(parsed.tables.filter(isKnown))];
  for (const bp of ['desktop', 'tablet', 'mobile'] as const) {
    const saved = parsed.layouts[bp].filter((r) => isKnown(r.i));
    if (new Set(saved.map((r) => r.i)).size !== saved.length)
      throw Error('Duplicate KPI coordinates');
    const rows = base.layouts[bp].map((r) => ({ ...r, ...saved.find((s) => s.i === r.i), i: r.i }));
    if (rows.some((r) => r.w < r.minW || r.x + r.w > cols[bp])) throw Error('Invalid card bounds');
    const visible = rows.filter((r) => !base.hidden.includes(r.i));
    const collision = visible.some((r, i) =>
      visible
        .slice(i + 1)
        .some((s) => r.x < s.x + s.w && r.x + r.w > s.x && r.y < s.y + s.h && r.y + r.h > s.y),
    );
    base.layouts[bp] = collision ? pack(rows, cols[bp]) : rows;
  }
  return base;
}
const mappings: Record<string, KpiId> = {
  otp: 'ao-otp-all',
  turnaround: 'tm-turnaround-time',
  runway: 'ro-utilization',
  security: 'pf-security-wait',
};
export function migrateLegacy(value: unknown) {
  const docs = Object.fromEntries(categories.map((c) => [c.id, defaults(c.id)])) as Record<
    CategoryId,
    CategoryLayout
  >;
  const legacy = z
    .object({
      layouts: z.object({
        desktop: z.array(position.omit({ h: true }).extend({ h: z.number() })),
        tablet: z.array(position.omit({ h: true }).extend({ h: z.number() })),
        mobile: z.array(position.omit({ h: true }).extend({ h: z.number() })),
      }),
      hidden: z.array(z.string()),
      settings: z.record(z.string(), z.object({ display: z.string() }).passthrough()),
    })
    .parse(value);
  for (const category of categories) {
    const doc = docs[category.id];
    for (const [old, id] of Object.entries(mappings))
      if (categoryEntries(category.id).some((k) => k.id === id)) {
        if (legacy.hidden.includes(old)) doc.hidden.push(id);
        if (legacy.settings[old]?.display === 'table') doc.tables.push(id);
        for (const bp of ['desktop', 'tablet', 'mobile'] as const) {
          const item = legacy.layouts[bp].find((r) => r.i === old);
          if (item)
            doc.layouts[bp] = doc.layouts[bp].map((r) =>
              r.i === id
                ? {
                    ...r,
                    w: Math.max(r.minW, Math.min(cols[bp], item.w)),
                    h: Math.max(8, Math.min(24, item.h)),
                  }
                : r,
            );
        }
      }
    for (const bp of ['desktop', 'tablet', 'mobile'] as const)
      doc.layouts[bp] = pack(doc.layouts[bp], cols[bp]);
  }
  return docs;
}
function load() {
  let documents = Object.fromEntries(categories.map((c) => [c.id, defaults(c.id)])) as Record<
      CategoryId,
      CategoryLayout
    >,
    notice = '';
  if (typeof window === 'undefined') return { documents, notice };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const root = z
        .object({
          schemaVersion: z.literal(2),
          airportId: z.literal(airport.id),
          categories: z.record(z.string(), z.unknown()),
        })
        .parse(JSON.parse(raw));
      for (const c of categories)
        try {
          if (root.categories[c.id]) documents[c.id] = validate(c.id, root.categories[c.id]);
        } catch {
          notice = 'A category layout could not be read and was restored to its default.';
        }
    } else {
      const old = localStorage.getItem(storageKeys.legacyLayouts);
      if (old) {
        documents = migrateLegacy(JSON.parse(old));
        notice =
          'Compatible display sizes were migrated. Your original layout remains backed up; save each category to keep its new layout.';
      }
    }
  } catch {
    notice =
      'Saved preferences could not be read. Defaults are ready; your previous data was not overwritten.';
  }
  return { documents, notice };
}
interface Store {
  documents: Record<CategoryId, CategoryLayout>;
  drafts: Partial<Record<CategoryId, CategoryLayout>>;
  notice: string;
  begin: (id: CategoryId) => void;
  cancel: (id: CategoryId) => void;
  save: (id: CategoryId) => void;
  reset: (id: CategoryId) => void;
  change: (id: CategoryId, fn: (doc: CategoryLayout) => CategoryLayout) => void;
  clear: () => void;
}
export const useCategoryWorkspace = create<Store>((set, get) => ({
  ...load(),
  drafts: {},
  begin: (id) =>
    set((s) => ({ drafts: { ...s.drafts, [id]: structuredClone(s.documents[id]) }, notice: '' })),
  cancel: (id) =>
    set((s) => {
      const drafts = { ...s.drafts };
      delete drafts[id];
      return { drafts, notice: 'Layout changes discarded.' };
    }),
  save: (id) => {
    const draft = get().drafts[id];
    if (!draft) return;
    try {
      const documents = { ...get().documents, [id]: validate(id, draft) };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ schemaVersion: 2, airportId: airport.id, categories: documents }),
      );
      const drafts = { ...get().drafts };
      delete drafts[id];
      set({ documents, drafts, notice: 'Category layout has been saved on this browser.' });
    } catch {
      set({ notice: 'Could not save to this browser. Your draft is still available.' });
    }
  },
  reset: (id) =>
    set((s) => ({
      drafts: { ...s.drafts, [id]: defaults(id) },
      notice: 'Default category layout loaded. Save to keep it.',
    })),
  change: (id, fn) =>
    set((s) => ({
      drafts: { ...s.drafts, [id]: fn(structuredClone(s.drafts[id] ?? s.documents[id])) },
    })),
  clear: () => set({ notice: '' }),
}));
