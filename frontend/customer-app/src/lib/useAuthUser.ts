import { useMemo, useSyncExternalStore } from 'react';

const subscribe = (cb: () => void) => {
  window.addEventListener('storage', cb);
  return () => window.removeEventListener('storage', cb);
};

/** Reads the signed-in user from localStorage; null on the server and when signed out. */
export function useAuthUser(): { username: string; role: string } | null {
  // The raw string is the snapshot: it is stable between renders, unlike a parsed object.
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem('auth_user'),
    () => null,
  );
  return useMemo(() => {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }, [raw]);
}
