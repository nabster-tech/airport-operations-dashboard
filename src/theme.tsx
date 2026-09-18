import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

type ThemePreference = 'light' | 'dark' | 'system';
const storageKey = 'airside.theme.v1';
const isPreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(storageKey);
    return isPreference(value) ? value : 'system';
  } catch {
    return 'system';
  }
}
function applyTheme(preference: ThemePreference) {
  const resolved =
    preference === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : preference;
  document.documentElement.dataset.theme = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolved === 'dark' ? '#0b1019' : '#f3f6fa');
}
// Resolve appearance before React mounts to avoid a wrong-theme first frame.
export function initializeTheme() {
  applyTheme(readPreference());
}
export function ThemeSelector() {
  const [preference, setPreference] = useState<ThemePreference>(readPreference);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    applyTheme(preference);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const systemChanged = () => {
      if (preference === 'system') applyTheme('system');
    };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) {
        setPreference(readPreference());
        setNotice('');
      }
    };
    media.addEventListener('change', systemChanged);
    window.addEventListener('storage', storageChanged);
    return () => {
      media.removeEventListener('change', systemChanged);
      window.removeEventListener('storage', storageChanged);
    };
  }, [preference]);
  const Icon = preference === 'system' ? Monitor : preference === 'light' ? Sun : Moon;
  return (
    <div className="theme-control">
      <label className="theme-selector">
        <Icon size={15} aria-hidden="true" />
        <span className="sr-only">Color theme</span>
        <select
          value={preference}
          onChange={(event) => {
            const next = event.target.value;
            if (!isPreference(next)) return;
            applyTheme(next);
            setPreference(next);
            try {
              localStorage.setItem(storageKey, next);
              setNotice('');
            } catch {
              setNotice('Theme changed for this visit. Browser storage is unavailable.');
            }
          }}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </label>
      {notice && (
        <span className="theme-notice" role="status">
          {notice}
        </span>
      )}
    </div>
  );
}
