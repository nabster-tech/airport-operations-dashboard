import { describe, expect, it } from 'vitest';
import {
  defaultDocument,
  loadDocument,
  overlaps,
  parseDocument,
  saveDocument,
  STORAGE_KEY,
} from '../src/layout/layoutPersistence';
import { useWorkspace } from '../src/layout/layoutStore';
describe('workspace persistence', () => {
  it('provides 13 valid cards at each breakpoint without overlap', () => {
    const doc = parseDocument(defaultDocument());
    for (const layout of Object.values(doc.layouts)) {
      expect(layout).toHaveLength(13);
      expect(layout.some((r, i) => layout.slice(i + 1).some((o) => overlaps(r, o)))).toBe(false);
    }
  });
  it('preserves settings, hidden cards, and independent breakpoints on save/reload', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (k: string, v: string) => {
        values.set(k, v);
      },
    };
    const doc = defaultDocument();
    doc.hidden = ['security'];
    doc.settings.throughput = { display: 'table', density: 'compact' };
    saveDocument(doc, storage);
    expect(values.has(STORAGE_KEY)).toBe(true);
    expect(loadDocument(storage).document.hidden).toEqual(['security']);
    expect(loadDocument(storage).document.settings).toEqual(doc.settings);
    expect(doc.layouts.desktop[0].w).toBe(6);
    expect(doc.layouts.mobile[0].w).toBe(1);
  });
  it('recovers from malformed JSON, unavailable storage, and rejects invalid coordinates', () => {
    expect(loadDocument({ getItem: () => '{broken', setItem: () => {} }).notice).toContain(
      'could not be read',
    );
    expect(
      loadDocument({
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => {},
      }).document,
    ).toEqual(defaultDocument());
    const invalid = defaultDocument();
    invalid.layouts.desktop[0].w = 50;
    expect(() => parseDocument(invalid)).toThrow();
  });
  it('validates duplicate/overlapping cards and preserves the error on a failed save', () => {
    const doc = defaultDocument();
    doc.layouts.desktop[1].x = 0;
    expect(() => parseDocument(doc)).toThrow('overlap');
    const duplicate = defaultDocument();
    duplicate.layouts.mobile.push({ ...duplicate.layouts.mobile[0] });
    expect(() => parseDocument(duplicate)).toThrow('Duplicate');
    expect(() =>
      saveDocument(defaultDocument(), {
        getItem: () => null,
        setItem: () => {
          throw new Error('Quota exceeded');
        },
      }),
    ).toThrow('Quota exceeded');
  });
  it('migrates v0, drops unknown widgets, and appends new registry widgets', () => {
    const old = { ...defaultDocument(), schemaVersion: 0 };
    old.layouts.desktop = old.layouts.desktop.slice(0, 3);
    const migrated = parseDocument(old);
    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.layouts.desktop).toHaveLength(13);
    const unknown = defaultDocument();
    unknown.hidden.push('retired' as never);
    expect(parseDocument(unknown).hidden).toEqual([]);
  });
  it('cancels an edit draft without losing the saved document', () => {
    useWorkspace.setState({ document: defaultDocument(), draft: null });
    useWorkspace.getState().begin();
    useWorkspace.getState().hide('security');
    useWorkspace.getState().resize('throughput', 'desktop', 'wide');
    expect(useWorkspace.getState().draft!.hidden).toEqual(['security']);
    useWorkspace.getState().cancel();
    expect(useWorkspace.getState().draft).toBeNull();
    expect(useWorkspace.getState().document).toEqual(defaultDocument());
  });
  it('restores hidden cards without overlap and supports keyboard order changes', () => {
    useWorkspace.setState({ document: defaultDocument(), draft: null });
    useWorkspace.getState().begin();
    useWorkspace.getState().hide('security');
    useWorkspace.getState().restore('security');
    expect(() => parseDocument(useWorkspace.getState().draft)).not.toThrow();
    const previousIndex = [...useWorkspace.getState().draft!.layouts.mobile]
      .sort((a, b) => a.y - b.y)
      .findIndex((r) => r.i === 'gates');
    useWorkspace.getState().move('gates', 'mobile', -1);
    const rows = useWorkspace.getState().draft!.layouts.mobile.sort((a, b) => a.y - b.y);
    expect(rows.findIndex((r) => r.i === 'gates')).toBe(previousIndex - 1);
    useWorkspace.getState().cancel();
  });
});
