import { MAX_BODY_BYTES, RateLimiter, clientKey, parsePayload } from './chatGuard.ts';

export interface ChatDeps {
  env: { N8N_WEBHOOK_URL?: string; N8N_WEBHOOK_SECRET?: string };
  fetch: typeof fetch;
  limiter: RateLimiter;
  warn?: (message: string) => void;
}

/**
 * Forwards the chat to an n8n webhook. The URL comes from the environment (N8N_WEBHOOK_URL) and is
 * never committed: a webhook URL is a credential, anyone who knows it can run the workflow. An optional
 * N8N_WEBHOOK_SECRET is sent as the X-Webhook-Secret header. Requests are validated, size-limited and
 * rate-limited per client.
 */
export async function handleChat(req: Request, deps: ChatDeps): Promise<Response> {
  const webhook = deps.env.N8N_WEBHOOK_URL;
  if (!webhook) {
    return Response.json(
      { output: 'Yapay zeka ajanı yapılandırılmamış (N8N_WEBHOOK_URL tanımlı değil).' },
      { status: 503 },
    );
  }

  if (!deps.limiter.allow(clientKey(req.headers.get('x-forwarded-for')))) {
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

    const text = await response.text();
    if (!text) {
      return Response.json({ output: 'Yanıt alınamadı.' });
    }

    return Response.json(JSON.parse(text));
  } catch {
    return Response.json({ output: 'Ajan yanıt vermedi.' }, { status: 502 });
  }
}
