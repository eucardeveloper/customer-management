import { NextRequest, NextResponse } from 'next/server';
import { MAX_BODY_BYTES, RateLimiter, clientKey, parsePayload } from '@/lib/chatGuard';

const limiter = new RateLimiter();

/**
 * Forwards the chat to an n8n webhook. The URL comes from the environment (N8N_WEBHOOK_URL) and is
 * never committed: a webhook URL is a credential, anyone who knows it can run the workflow. An optional
 * N8N_WEBHOOK_SECRET is sent as the X-Webhook-Secret header (n8n "Header Auth" on the webhook node), so
 * the URL alone is not enough. Requests are validated, size-limited and rate-limited per client.
 */
export async function POST(req: NextRequest) {
  const webhook = process.env.N8N_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json(
      { output: 'Yapay zeka ajanı yapılandırılmamış (N8N_WEBHOOK_URL tanımlı değil).' },
      { status: 503 },
    );
  }

  if (!limiter.allow(clientKey(req.headers.get('x-forwarded-for')))) {
    return NextResponse.json({ output: 'Çok fazla istek. Biraz bekleyin.' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) {
    return NextResponse.json({ output: 'İstek çok büyük.' }, { status: 413 });
  }
  const payload = parsePayload(await req.text());
  if (!payload) {
    return NextResponse.json({ output: 'Geçersiz istek.' }, { status: 400 });
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.N8N_WEBHOOK_SECRET) headers['X-Webhook-Secret'] = process.env.N8N_WEBHOOK_SECRET;

  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000),
    });

    const text = await response.text();
    if (!text) {
      return NextResponse.json({ output: 'Yanıt alınamadı.' });
    }

    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json({ output: 'Ajan yanıt vermedi.' }, { status: 502 });
  }
}
