import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { airport, storageKeys } from './categories/airport';

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
const KEY = storageKeys.presentation;
const LEGACY_KEY = 'airside.presentation.v1';
const rates: Record<Currency, number> = { INR: 1, EUR: 0.011, USD: 0.012 };
export function convertCurrency(amount: number, from: Currency, to: Currency) {
  return (amount / rates[from]) * rates[to];
}
function readPreferences() {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY) ?? '{}',
    );
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
function clockLabel(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

function calendarKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function dayLabel(date: Date, timeZone: string, includeYear = false) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    day: '2-digit',
    month: 'short',
    ...(includeYear ? { year: 'numeric' as const } : {}),
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${value('day')} ${value('month')}${includeYear ? ` ${value('year')}` : ''}`;
}

export function formatTimelineLabel(minute: number, localAndUtc: boolean) {
  const date = new Date(Date.parse(airport.fixtureLocalMidnightInstant) + minute * 60_000);
  const local = `${clockLabel(date, airport.timeZone)} ${airport.timeZoneAbbreviation}`;
  if (!localAndUtc) return local;
  const utcDay = dayLabel(date, 'UTC');
  const rollover =
    calendarKey(date, airport.timeZone) === calendarKey(date, 'UTC') ? '' : ` (${utcDay})`;
  return `${local} · ${clockLabel(date, 'UTC')} UTC${rollover}`;
}

export function formatSnapshotLabel(localAndUtc: boolean) {
  const date = new Date(airport.snapshotInstant);
  const local = `${dayLabel(date, airport.timeZone, true)} · ${clockLabel(date, airport.timeZone)} ${airport.timeZoneAbbreviation}`;
  return localAndUtc ? `${local} · ${clockLabel(date, 'UTC')} UTC` : local;
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
      timeLabel: (minute) => formatTimelineLabel(minute, prefs.localAndUtc),
      snapshotLabel: () => formatSnapshotLabel(prefs.localAndUtc),
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
export function PresentationControls() {
  const view = usePresentation();
  return (
    <div className="presentation-controls">
      <label
        className="currency-control"
        title={`Illustrative fixed demo exchange rates; monetary source values use ${airport.baseCurrency}. The current KPI catalog has no monetary metrics.`}
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
