/**
 * Input checks and a small rate limit for the chat proxy. The proxy has no user accounts (it fronts an
 * n8n webhook), so the guard keeps it from being a free way to run the workflow: only the two fields
 * the workflow needs are forwarded, their size is bounded, and each signed-in user gets a fixed number
 * of requests per minute.
 */
export const MAX_BODY_BYTES = 8 * 1024;
export const MAX_INPUT_CHARS = 2000;
export const RATE_LIMIT_PER_MINUTE = 15;

export interface ChatPayload {
  chatInput: string;
  sessionId: string;
}

export function parsePayload(raw: string): ChatPayload | null {
  if (raw.length === 0 || new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const { chatInput, sessionId } = data as Record<string, unknown>;
  if (typeof chatInput !== 'string' || chatInput.trim().length === 0 || chatInput.length > MAX_INPUT_CHARS) return null;
  if (typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(sessionId)) return null;
  return { chatInput, sessionId };
}

export class RateLimiter {
  private hits = new Map<string, number[]>();
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number = RATE_LIMIT_PER_MINUTE, windowMs: number = 60_000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /** True when this request is allowed (and counts it). */
  allow(key: string, now: number = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 5000) {
      for (const [k, v] of this.hits) {
        if (v.every((t) => now - t >= this.windowMs)) this.hits.delete(k);
      }
    }
    return true;
  }
}

/**
 * Id that ties one conversation to the agent's memory (n8n chat memory is keyed by it): 122 random bits
 * in UUID layout. Built from getRandomValues because crypto.randomUUID needs a secure context, which a
 * LAN address over plain HTTP is not.
 */
export function newSessionId(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `session-${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
