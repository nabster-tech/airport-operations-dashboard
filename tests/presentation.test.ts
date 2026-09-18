import { describe, expect, it } from 'vitest';
import { convertCurrency } from '../src/presentation';

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
});
