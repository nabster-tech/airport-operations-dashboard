import { useSyncExternalStore } from 'react';
import { isCategory, type CategoryId } from './catalog';
const read = () => (typeof window === 'undefined' ? '' : window.location.hash.slice(7));
const subscribe = (fn: () => void) => {
  window.addEventListener('hashchange', fn);
  return () => window.removeEventListener('hashchange', fn);
};
export function useCategoryRoute() {
  const raw = useSyncExternalStore(subscribe, read, () => '');
  return {
    category: isCategory(raw) ? raw : ('airside-operations' as CategoryId),
    invalid: raw !== '' && !isCategory(raw),
  };
}
export function navigate(category: CategoryId) {
  window.location.hash = '/kpis/' + category;
}
