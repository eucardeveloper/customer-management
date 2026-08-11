import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const response = await fetch(
      'https://n8n-production-53424.up.railway.app/webhook/e3f86e7c-0c58-4ac0-a8a2-a5d7c95a3fd0/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const text = await response.text();

    if (!text) {
      return NextResponse.json({ output: 'Yanıt alınamadı.' });
    }

    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ output: 'Sunucu hatası oluştu.' });
  }
}