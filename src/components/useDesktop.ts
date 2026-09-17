import { useSyncExternalStore } from 'react';
const query = '(min-width: 1100px)';
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
const getSnapshot = () => window.matchMedia(query).matches;
export const useDesktop = () => useSyncExternalStore(subscribe, getSnapshot, () => false);
