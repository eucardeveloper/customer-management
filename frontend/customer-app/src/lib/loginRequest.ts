// The browser reports "Failed to fetch" when the API is not reachable yet. Right after
// `docker compose up` the gateway and the services need a while to boot while the web app
// is already serving, so the first sign-in attempts can hit a closed port or a 502/503/504.
// Those cases are retried a few times; a real answer (200, 401, 429...) is returned at once.

export const STARTING_MESSAGE =
  'The server is not reachable yet. It may still be starting; please try again in a few seconds.';

const TRANSIENT_STATUSES = new Set([502, 503, 504]);

export function isTransientStatus(status: number): boolean {
  return TRANSIENT_STATUSES.has(status);
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export async function fetchWithStartupRetry(
  doFetch: FetchLike,
  url: string,
  init: RequestInit,
  options: { attempts?: number; delayMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<Response> {
  const attempts = options.attempts ?? 4;
  const delayMs = options.delayMs ?? 1500;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await doFetch(url, init);
      if (!isTransientStatus(res.status) || i === attempts - 1) return res;
    } catch {
      if (i === attempts - 1) break;
    }
    await sleep(delayMs);
  }
  throw new Error(STARTING_MESSAGE);
}
