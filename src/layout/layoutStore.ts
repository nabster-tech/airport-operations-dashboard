import { create } from 'zustand';
import { minimumRows } from '../widgetRegistry';
import {
  columnCounts,
  defaultDocument,
  loadDocument,
  pack,
  saveDocument,
} from './layoutPersistence';
import type {
  Breakpoint,
  GridCoordinates,
  LayoutDocument,
  WidgetId,
  WidgetSettings,
} from '../types';
const getStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};
const initial = loadDocument(typeof window === 'undefined' ? undefined : getStorage());
const clone = (doc: LayoutDocument) => structuredClone(doc);
interface Workspace {
  document: LayoutDocument;
  draft: LayoutDocument | null;
  notice: string;
  lastHidden: WidgetId | null;
  begin: () => void;
  cancel: () => void;
  save: () => void;
  reset: () => void;
  clearNotice: () => void;
  updateLayout: (breakpoint: Breakpoint, layout: GridCoordinates[]) => void;
  hide: (id: WidgetId) => void;
  restore: (id: WidgetId) => void;
  setSettings: (id: WidgetId, settings: Partial<WidgetSettings>) => void;
  move: (id: WidgetId, breakpoint: Breakpoint, direction: -1 | 1) => void;
  resize: (id: WidgetId, breakpoint: Breakpoint, size: 'standard' | 'large' | 'wide') => void;
}
export const useWorkspace = create<Workspace>((set, get) => ({
  document: initial.document,
  draft: null,
  notice: initial.notice,
  lastHidden: null,
  begin: () => set((s) => ({ draft: clone(s.document), lastHidden: null, notice: '' })),
  cancel: () => set({ draft: null, lastHidden: null, notice: 'Layout changes discarded.' }),
  save: () => {
    const draft = get().draft;
    if (!draft) return;
    try {
      const storage = getStorage();
      if (!storage) throw new Error('Storage unavailable');
      const document = saveDocument(draft, storage);
      set({
        document,
        draft: null,
        lastHidden: null,
        notice: 'Your workspace has been saved on this browser.',
      });
    } catch {
      set({
        notice:
          'Could not save to this browser. Your changes are still in the editor. Check browser storage, then try again.',
      });
    }
  },
  reset: () =>
    set({
      draft: defaultDocument(),
      lastHidden: null,
      notice: 'Default layout loaded. Save to keep it, or cancel to return.',
    }),
  clearNotice: () => set({ notice: '' }),
  updateLayout: (breakpoint, layout) =>
    set((s) => {
      if (!s.draft) return s;
      const current = s.draft.layouts[breakpoint];
      const known = layout.filter((r) => current.some((c) => c.i === r.i));
      const merged = current.map((r) => known.find((n) => n.i === r.i) ?? r);
      if (JSON.stringify(merged) === JSON.stringify(current)) return s;
      return { draft: { ...s.draft, layouts: { ...s.draft.layouts, [breakpoint]: merged } } };
    }),
  hide: (id) =>
    set((s) =>
      s.draft
        ? {
            draft: { ...s.draft, hidden: [...new Set([...s.draft.hidden, id])] },
            lastHidden: id,
            notice: 'Card hidden from this layout. You can undo or restore it before saving.',
          }
        : s,
    ),
  restore: (id) =>
    set((s) => {
      if (!s.draft) return s;
      const layouts = clone(s.draft).layouts;
      for (const bp of ['desktop', 'tablet', 'mobile'] as const) {
        const bottom = Math.max(
          0,
          ...layouts[bp].filter((r) => !s.draft!.hidden.includes(r.i)).map((r) => r.y + r.h),
        );
        layouts[bp] = layouts[bp].map((r) => (r.i === id ? { ...r, x: 0, y: bottom } : r));
      }
      return {
        draft: { ...s.draft, hidden: s.draft.hidden.filter((i) => i !== id), layouts },
        lastHidden: null,
        notice: 'Card restored at the end of your dashboard.',
      };
    }),
  setSettings: (id, changes) =>
    set((s) => {
      const current = s.draft ?? s.document;
      const settings = {
        display: 'chart' as const,
        density: 'comfortable' as const,
        ...current.settings[id],
        ...changes,
      };
      const next = { ...current, settings: { ...current.settings, [id]: settings } };
      if (s.draft) return { draft: next };
      try {
        const storage = getStorage();
        if (!storage) throw new Error('Storage unavailable');
        return { document: saveDocument(next, storage) };
      } catch {
        return {
          document: next,
          notice:
            'Display changed for this session. Browser storage is unavailable, so it was not saved.',
        };
      }
    }),
  move: (id, bp, direction) =>
    set((s) => {
      if (!s.draft) return s;
      const visible = s.draft.layouts[bp]
        .filter((r) => !s.draft!.hidden.includes(r.i))
        .sort((a, b) => a.y - b.y || a.x - b.x);
      const i = visible.findIndex((r) => r.i === id),
        j = i + direction;
      if (i < 0 || j < 0 || j >= visible.length) return s;
      [visible[i], visible[j]] = [visible[j], visible[i]];
      const layout = [
        ...pack(visible, columnCounts[bp]),
        ...s.draft.layouts[bp].filter((r) => s.draft!.hidden.includes(r.i)),
      ];
      return {
        draft: { ...s.draft, layouts: { ...s.draft.layouts, [bp]: layout } },
        notice: 'Card moved ' + (direction === -1 ? 'earlier.' : 'later.'),
      };
    }),
  resize: (id, bp, size) =>
    set((s) => {
      if (!s.draft) return s;
      const cols = columnCounts[bp],
        width =
          bp === 'mobile'
            ? 1
            : size === 'wide'
              ? cols
              : size === 'large'
                ? Math.min(6, cols)
                : Math.min(3, cols);
      const visible = s.draft.layouts[bp]
        .filter((r) => !s.draft!.hidden.includes(r.i))
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map((r) =>
          r.i === id
            ? { ...r, w: width, h: Math.max(size === 'standard' ? 8 : 10, minimumRows(id)) }
            : r,
        );
      return {
        draft: {
          ...s.draft,
          layouts: {
            ...s.draft.layouts,
            [bp]: [
              ...pack(visible, cols),
              ...s.draft.layouts[bp].filter((r) => s.draft!.hidden.includes(r.i)),
            ],
          },
        },
      };
    }),
}));
