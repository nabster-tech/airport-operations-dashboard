import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { categories, entries, categoryEntries } from '../src/categories/catalog';
import {
  aggregate,
  calculate,
  grouped,
  observations,
  specs,
  staticSource,
} from '../src/categories/source';
import { defaultFilters } from '../src/categories/models';
import {
  defaults,
  validate,
  migrateLegacy,
  useCategoryWorkspace,
} from '../src/categories/workspace';
import { defaultDocument } from '../src/layout/layoutPersistence';
describe('category catalog and static calculations', () => {
  it('matches all 71 source names exactly once in the 11 required categories', () => {
    const rows = readFileSync('docs/planning/KPI_REQUIREMENTS.tsv', 'utf8')
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((line) => line.split('\t'));
    expect(entries).toHaveLength(71);
    expect(new Set(entries.map((e) => e.id)).size).toBe(71);
    expect(categories.map((c) => categoryEntries(c.id).length)).toEqual([
      9, 6, 6, 9, 8, 6, 7, 5, 3, 5, 7,
    ]);
    for (const [category, title] of rows)
      expect(entries.find((e) => e.title === title)?.category).toBe(
        categories.find((c) => c.label === category)?.id,
      );
  });
  it('provides finite aggregates, actual observations and definitions for every KPI', () => {
    for (const entry of entries) {
      const metric = calculate(entry.id, defaultFilters);
      expect(specs[entry.id].formula.length).toBeGreaterThan(25);
      expect(observations[entry.id].length).toBeGreaterThan(0);
      expect(metric.value).not.toBeNull();
      expect(Number.isFinite(metric.value)).toBe(true);
    }
  });
  it('reconciles runway incursion count and rate across time and runway filters', () => {
    for (const range of ['today', 'six', 'hour'] as const)
      for (const runway of ['all', '09L/27R', '09R/27L']) {
        const filters = { ...defaultFilters, range, runway };
        const count = calculate('ro-incursions', filters),
          rate = calculate('as-incursion-rate', filters);
        expect(rate.numerator).toBe(count.value);
        expect(rate.value).toBe(
          rate.denominator ? (rate.numerator / rate.denominator) * 10000 : null,
        );
      }
  });
  it('reuses resource records for the report and recomputes aggregated percentages', () => {
    for (const resource of ['all', 'GPU', 'PBB']) {
      const filters = { ...defaultFilters, resource };
      const metric = calculate('gs-resource-utilization', filters),
        report = calculate('ra-resource-report', filters);
      expect(report.value).toBe(metric.value);
      const groups = grouped(report, 'day');
      expect(groups[0].value).toBe(report.value);
    }
  });
  it('keeps queue waiting, processing and baggage timestamp semantics distinct', () => {
    expect(calculate('pf-immigration-processing', defaultFilters).value).not.toBe(
      calculate('pf-immigration-wait', defaultFilters).value,
    );
    const bags = calculate('to-bags', defaultFilters);
    expect(bags.reference!).toBeGreaterThan(bags.value!);
  });
  it('filters supported dimensions and does not apply terminal scope to runway utilization', () => {
    expect(calculate('ro-utilization', { ...defaultFilters, terminal: 'T1' }).value).toBe(
      calculate('ro-utilization', defaultFilters).value,
    );
    expect(
      calculate('ao-otp-all', { ...defaultFilters, terminal: 'T1' }).rows.every(
        (r) => r.terminal === 'T1',
      ),
    ).toBe(true);
    expect(calculate('ao-sobt', { ...defaultFilters, movement: 'arrivals' }).state).toBe(
      'not-applicable',
    );
  });
  it('keeps zero events separate from unavailable rates and excludes unknown FOD onset', () => {
    expect(aggregate([], specs['ro-incursions'])).toBe(0);
    expect(aggregate([], specs['as-incursion-rate'])).toBeNull();
    expect(calculate('as-fod', defaultFilters).reference).toBe(3);
  });
  it('supports cancellation at the source boundary', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      staticSource.snapshot('airside-operations', defaultFilters, controller.signal),
    ).rejects.toThrow();
  });
});
describe('category layouts', () => {
  it('creates valid independent layouts and rejects cross-boundary coordinates', () => {
    for (const category of categories) {
      const doc = defaults(category.id);
      expect(validate(category.id, doc)).toEqual(doc);
    }
    const bad = defaults('airside-operations');
    bad.layouts.desktop[0].x = 100;
    expect(() => validate('airside-operations', bad)).toThrow();
  });
  it('retains separate category drafts and cancels only the selected category', () => {
    const store = useCategoryWorkspace.getState();
    store.begin('airside-operations');
    store.begin('passenger-flow');
    store.change('airside-operations', (doc) => ({ ...doc, hidden: ['ao-otp-all'] }));
    expect(useCategoryWorkspace.getState().drafts['passenger-flow']!.hidden).toEqual([]);
    store.cancel('airside-operations');
    expect(useCategoryWorkspace.getState().drafts['passenger-flow']).toBeDefined();
    store.cancel('passenger-flow');
  });
  it('migrates only compatible legacy preferences and leaves incompatible metrics out', () => {
    const legacy = defaultDocument();
    legacy.hidden = ['otp', 'baggage'];
    legacy.settings.security = { display: 'table', density: 'comfortable' };
    const docs = migrateLegacy(legacy);
    expect(docs['airside-operations'].hidden).toContain('ao-otp-all');
    expect(docs['terminal-operations'].hidden).toEqual([]);
    expect(docs['passenger-flow'].tables).toContain('pf-security-wait');
  });
});
