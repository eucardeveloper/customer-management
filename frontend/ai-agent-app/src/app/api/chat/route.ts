import { NextRequest, NextResponse } from 'next/server';

/**
 * Forwards the chat to an n8n webhook. The URL comes from the environment (N8N_WEBHOOK_URL) and is
 * never committed: a webhook URL is a credential, anyone who knows it can run the workflow.
 */
export async function POST(req: NextRequest) {
  const webhook = process.env.N8N_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json(
      { output: 'Yapay zeka ajanı yapılandırılmamış (N8N_WEBHOOK_URL tanımlı değil).' },
      { status: 503 },
    );
  }

  const body = await req.json();

  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
