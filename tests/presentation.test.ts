import { describe, expect, it } from 'vitest';
import { convertCurrency, formatSnapshotLabel, formatTimelineLabel } from '../src/presentation';

describe('fixed demonstration currency conversions', () => {
  it('converts between INR, EUR and USD using INR as the base', () => {
    expect(convertCurrency(1000, 'INR', 'EUR')).toBeCloseTo(11);
    expect(convertCurrency(1000, 'INR', 'USD')).toBeCloseTo(12);
    expect(convertCurrency(11, 'EUR', 'INR')).toBeCloseTo(1000);
    expect(convertCurrency(12, 'USD', 'EUR')).toBeCloseTo((12 / 0.012) * 0.011);
  });
  it('keeps the amount unchanged for the same currency', () => {
    expect(convertCurrency(1250, 'EUR', 'EUR')).toBe(1250);
  });

  it('makes UTC date rollover explicit while keeping snapshot labels configured', () => {
    expect(formatTimelineLabel(15, true)).toBe('00:15 IST · 18:45 UTC (16 Sep)');
    expect(formatTimelineLabel(840, true)).toBe('14:00 IST · 08:30 UTC');
    expect(formatSnapshotLabel(true)).toBe('17 Sep 2026 · 14:00 IST · 08:30 UTC');
  });
});
