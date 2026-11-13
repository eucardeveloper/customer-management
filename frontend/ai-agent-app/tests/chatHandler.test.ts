import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RateLimiter } from '../src/lib/chatGuard.ts';
import { handleChat, type ChatDeps } from '../src/lib/chatHandler.ts';

const WEBHOOK = 'http://n8n:5678/webhook/abc/chat';

function chatRequest(body: unknown = { chatInput: 'Tüm müşterileri listele', sessionId: 'session-1' }, headers: Record<string, string> = {}) {
  return new Request('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

interface Calls { urls: string[]; headers: Array<Record<string, string>>; bodies: string[] }

function deps(overrides: Partial<ChatDeps> = {}, answer: () => Response = () => Response.json({ output: 'Merhaba' })): { d: ChatDeps; calls: Calls } {
  const calls: Calls = { urls: [], headers: [], bodies: [] };
  const d: ChatDeps = {
    env: { N8N_WEBHOOK_URL: WEBHOOK },
    limiter: new RateLimiter(),
    fetch: (async (url: string | URL | Request, init?: RequestInit) => {
      calls.urls.push(String(url));
      calls.headers.push((init?.headers ?? {}) as Record<string, string>);
      calls.bodies.push(String(init?.body ?? ''));
      return answer();
    }) as typeof fetch,
    ...overrides,
  };
  return { d, calls };
}

test('without a webhook URL the agent answers 503', async () => {
  const { d } = deps({ env: {} });
  const res = await handleChat(chatRequest(), d);
  assert.equal(res.status, 503);
});

test('a malformed payload is refused with 400 and nothing is forwarded', async () => {
  const { d, calls } = deps();
  const res = await handleChat(chatRequest('not json'), d);
  assert.equal(res.status, 400);
  assert.equal(calls.urls.length, 0);
});

test('a valid chat is forwarded to n8n with only the two fields and the webhook secret', async () => {
  const { d, calls } = deps({ env: { N8N_WEBHOOK_URL: WEBHOOK, N8N_WEBHOOK_SECRET: 's3cret' } });
  const res = await handleChat(chatRequest({ chatInput: 'hi', sessionId: 'session-1', extra: 'dropped' }), d);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { output: 'Merhaba' });
  assert.deepEqual(calls.urls, [WEBHOOK]);
  assert.equal(calls.headers[0]['X-Webhook-Secret'], 's3cret');
  assert.deepEqual(JSON.parse(calls.bodies[0]), { chatInput: 'hi', sessionId: 'session-1' });
});

test('an unreachable agent answers 502', async () => {
  const { d } = deps({ fetch: (async () => { throw new Error('down'); }) as typeof fetch });
  const res = await handleChat(chatRequest(), d);
  assert.equal(res.status, 502);
});
