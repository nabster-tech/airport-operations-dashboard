import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Currency = 'EUR' | 'USD' | 'INR';
type Presentation = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  localAndUtc: boolean;
  toggleTimeZones: () => void;
  timeLabel: (minute: number) => string;
  snapshotLabel: () => string;
  convertValue: (value: number | null | undefined, unit: string) => number | null | undefined;
  displayUnit: (unit: string) => string;
  moneyLabel: (value: number, currency?: Currency) => string;
};
const Context = createContext<Presentation | null>(null);
const KEY = 'airside.presentation.v1';
const rates: Record<Currency, number> = { INR: 1, EUR: 0.011, USD: 0.012 };
export function convertCurrency(amount: number, from: Currency, to: Currency) {
  return (amount / rates[from]) * rates[to];
}
function readPreferences() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    if (typeof value === 'object' && value !== null) {
      const saved = value as Record<string, unknown>;
      return {
        currency:
          saved.currency === 'EUR' || saved.currency === 'USD' || saved.currency === 'INR'
            ? saved.currency
            : ('EUR' as Currency),
        localAndUtc: saved.localAndUtc === true,
      };
    }
  } catch {
    /* Missing or unavailable storage uses the PoC defaults. */
  }
  return { currency: 'EUR' as Currency, localAndUtc: false };
}
function clockLabel(minute: number, zone: 'airport' | 'utc') {
  const date = new Date(Date.parse('2026-09-17T00:00:00+05:30') + minute * 60_000);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: zone === 'airport' ? 'Asia/Kolkata' : 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}
export function PresentationProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState(readPreferences);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* Keep the choice for this visit. */
    }
  }, [prefs]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== KEY || event.newValue === null) return;
      try {
        const value = JSON.parse(event.newValue) as Record<string, unknown>;
        if (
          (value.currency === 'EUR' || value.currency === 'USD' || value.currency === 'INR') &&
          typeof value.localAndUtc === 'boolean'
        ) {
          setPrefs({ currency: value.currency, localAndUtc: value.localAndUtc });
        }
      } catch {
        /* Ignore malformed preferences from another tab. */
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const value = useMemo<Presentation>(
    () => ({
      ...prefs,
      setCurrency: (currency) => setPrefs((previous) => ({ ...previous, currency })),
      toggleTimeZones: () =>
        setPrefs((previous) => ({ ...previous, localAndUtc: !previous.localAndUtc })),
      timeLabel: (minute) => {
        const local = clockLabel(minute, 'airport') + ' IST';
        return prefs.localAndUtc ? local + ' · ' + clockLabel(minute, 'utc') + ' UTC' : local;
      },
      snapshotLabel: () =>
        prefs.localAndUtc ? '17 Sep 2026 · 14:00 IST · 08:30 UTC' : '17 Sep 2026 · 14:00 IST',
      convertValue: (amount, unit) =>
        amount == null
          ? amount
          : unit === 'INR' || unit === 'EUR' || unit === 'USD'
            ? convertCurrency(amount, unit, prefs.currency)
            : amount,
      displayUnit: (unit) =>
        unit === 'INR' || unit === 'EUR' || unit === 'USD' ? prefs.currency : unit,
      moneyLabel: (amount, currency = prefs.currency) =>
        new Intl.NumberFormat('en', {
          style: 'currency',
          currency,
          maximumFractionDigits: 0,
        }).format(amount),
    }),
    [prefs],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function usePresentation() {
  const value = useContext(Context);
  if (!value) throw new Error('PresentationProvider is missing');
  return value;
}
import { Clock3 } from 'lucide-react';
export function PresentationControls() {
  const view = usePresentation();
  return (
    <div className="presentation-controls">
      <label
        className="currency-control"
        title="Illustrative fixed demo exchange rates; source values are stored in INR."
      >
        <span className="sr-only">Display currency</span>
        <select
          aria-label="Display currency"
          value={view.currency}
          onChange={(event) => {
            const currency = event.target.value;
            if (currency === 'EUR' || currency === 'USD' || currency === 'INR')
              view.setCurrency(currency);
          }}
        >
          <option value="EUR">EUR €</option>
          <option value="USD">USD $</option>
          <option value="INR">INR ₹</option>
        </select>
      </label>
      <button
        type="button"
        className="secondary-button timezone-button"
        aria-pressed={view.localAndUtc}
        title="Show airport local time and UTC together"
        onClick={view.toggleTimeZones}
      >
        <Clock3 size={14} />
        <span>{view.localAndUtc ? 'IST + UTC' : 'Show UTC'}</span>
      </button>
    </div>
  );
}
