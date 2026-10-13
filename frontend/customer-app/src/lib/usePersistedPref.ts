import { useCallback, useSyncExternalStore } from 'react';

/**
 * A small string preference kept in localStorage (theme, sidebar state).
 *
 * useSyncExternalStore gives the server render the fallback and then switches to the stored value on the
 * client without a setState-in-effect. An in-memory copy keeps the preference working for the rest of the
 * session when storage is blocked (private window, disabled cookies).
 */
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener('storage', callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

function read(key: string, fallback: string): string {
  const inMemory = memory.get(key);
  if (inMemory !== undefined) return inMemory;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function usePersistedPref(key: string, fallback: string): [string, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );
  const setValue = useCallback(
    (next: string) => {
      memory.set(key, next);
      try {
        localStorage.setItem(key, next);
      } catch {
        /* storage unavailable: the in-memory copy still applies */
      }
      listeners.forEach((l) => l());
    },
    [key],
  );
  return [value, setValue];
}
