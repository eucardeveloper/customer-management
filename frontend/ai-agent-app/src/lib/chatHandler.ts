import { MAX_BODY_BYTES, RateLimiter, parsePayload } from './chatGuard.ts';

export interface ChatDeps {
  env: { N8N_WEBHOOK_URL?: string; N8N_WEBHOOK_SECRET?: string; GATEWAY_URL?: string };
  fetch: typeof fetch;
  limiter: RateLimiter;
  warn?: (message: string) => void;
}

/** The CRM session cookie set by the auth service (HttpOnly); cookies are shared across ports of one host. */
const SESSION_COOKIE = 'customer_session';
const GATEWAY_DEFAULT = 'http://localhost:8080';

interface Session { username: string; role: string }

function sessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === SESSION_COOKIE) {
      const value = part.slice(eq + 1).trim();
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

/** Asks the gateway whether the token is a live session. null = not honoured; throws when it cannot answer. */
async function currentSession(token: string, deps: ChatDeps): Promise<Session | null> {
  const base = (deps.env.GATEWAY_URL || GATEWAY_DEFAULT).replace(/\/+$/, '');
  const res = await deps.fetch(`${base}/api/auth/session`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(3_000),
  });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error(`gateway answered ${res.status}`);
  const body = (await res.json()) as Partial<Session> | null;
  if (typeof body?.username !== 'string' || typeof body?.role !== 'string') throw new Error('unexpected session answer');
  return { username: body.username, role: body.role };
}

/**
 * Forwards the chat to an n8n webhook, for signed-in ADMIN accounts only. The agent in n8n acts with
 * an admin account of the CRM, so letting anyone chat with it would hand out that account; the proxy
 * therefore asks the gateway whether the CRM session cookie is a live ADMIN session first. The limit is
 * per signed-in user (a forwarded-for header is whatever the client writes). Only the answer text of
 * n8n is passed on, never its error bodies.
 *
 * The webhook URL comes from the environment (N8N_WEBHOOK_URL) and is never committed: a webhook URL is
 * a credential. N8N_WEBHOOK_SECRET is sent as X-Webhook-Secret, which n8n's chat trigger does not check
 * (docker/n8n/README.md), so the URL stays private and n8n stays on loopback.
 */
export async function handleChat(req: Request, deps: ChatDeps): Promise<Response> {
  const webhook = deps.env.N8N_WEBHOOK_URL;
  if (!webhook) {
    return Response.json(
      { output: 'Yapay zeka ajanı yapılandırılmamış (N8N_WEBHOOK_URL tanımlı değil).' },
      { status: 503 },
    );
  }

  const token = sessionToken(req.headers.get('cookie'));
  if (!token) {
    return Response.json({ output: 'Önce CRM paneline giriş yapın.' }, { status: 401 });
  }
  let session: Session | null;
  try {
    session = await currentSession(token, deps);
  } catch {
    return Response.json({ output: 'Oturum doğrulanamadı. Biraz sonra tekrar deneyin.' }, { status: 503 });
  }
  if (!session) {
    return Response.json({ output: 'Oturumunuz geçersiz. CRM paneline yeniden giriş yapın.' }, { status: 401 });
  }
  if (session.role !== 'ADMIN') {
    return Response.json({ output: 'Yapay zeka asistanı yalnızca yönetici hesaplarına açıktır.' }, { status: 403 });
  }

  if (!deps.limiter.allow(`user:${session.username.toLowerCase()}`)) {
    return Response.json({ output: 'Çok fazla istek. Biraz bekleyin.' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) {
    return Response.json({ output: 'İstek çok büyük.' }, { status: 413 });
  }
  const payload = parsePayload(await req.text());
  if (!payload) {
    return Response.json({ output: 'Geçersiz istek.' }, { status: 400 });
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (deps.env.N8N_WEBHOOK_SECRET) {
    headers['X-Webhook-Secret'] = deps.env.N8N_WEBHOOK_SECRET;
  } else {
    deps.warn?.('N8N_WEBHOOK_SECRET is not set: anyone who learns the webhook URL can run the workflow.');
  }

  try {
    const response = await deps.fetch(webhook, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      return Response.json({ output: 'Ajan yanıt vermedi.' }, { status: 502 });
    }
    const text = await response.text();
    if (!text) {
      return Response.json({ output: 'Yanıt alınamadı.' });
    }

    const answer = JSON.parse(text) as { output?: unknown; text?: unknown; message?: unknown } | null;
    const output = [answer?.output, answer?.text, answer?.message].find((v) => typeof v === 'string' && v.length > 0);
    return Response.json({ output: output ?? 'Yanıt alınamadı.' });
  } catch {
    return Response.json({ output: 'Ajan yanıt vermedi.' }, { status: 502 });
  }
}
