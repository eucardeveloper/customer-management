import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** false during SSR and the first hydration pass, true afterwards (no setState-in-effect). */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
