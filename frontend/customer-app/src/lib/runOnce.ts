/**
 * Runs `fn` unless a previous call with the same flag is still in flight; returns false when it was skipped.
 * Used to stop a double click or a second Enter from sending the same create request twice (two orders,
 * two customers). The flag is a ref, not state, so it is already set when the second click arrives.
 */
export async function runOnce(flag: { current: boolean }, fn: () => Promise<void>): Promise<boolean> {
  if (flag.current) return false;
  flag.current = true;
  try {
    await fn();
    return true;
  } finally {
    flag.current = false;
  }
}
