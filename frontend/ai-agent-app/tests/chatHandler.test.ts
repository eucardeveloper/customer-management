import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RateLimiter, newSessionId } from '../src/lib/chatGuard.ts';
import { handleChat, type ChatDeps } from '../src/lib/chatHandler.ts';

const WEBHOOK = 'http://n8n:5678/webhook/abc/chat';
const GATEWAY = 'http://api-gateway:8080';
const COOKIE = { cookie: 'theme=dark; customer_session=tok-admin' };

function chatRequest(body: unknown = { chatInput: 'Tüm müşterileri listele', sessionId: 'session-1' }, headers: Record<string, string> = COOKIE) {
  return new Request('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

interface Calls { n8n: Array<{ headers: Record<string, string>; body: string }>; gateway: string[] }

/** `session` answers the gateway's GET /api/auth/session; `agent` answers the n8n webhook. */
function deps(options: {
  env?: ChatDeps['env'];
  session?: (token: string) => Response;
  agent?: () => Response;
} = {}): { d: ChatDeps; calls: Calls } {
  const calls: Calls = { n8n: [], gateway: [] };
  const session = options.session ?? (() => Response.json({ username: 'admin', role: 'ADMIN' }));
  const agent = options.agent ?? (() => Response.json({ output: 'Merhaba' }));
  const d: ChatDeps = {
    env: options.env ?? { N8N_WEBHOOK_URL: WEBHOOK, GATEWAY_URL: GATEWAY },
    limiter: new RateLimiter(),
    fetch: (async (url: string | URL | Request, init?: RequestInit) => {
      const target = String(url);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      if (target === `${GATEWAY}/api/auth/session`) {
        const bearer = headers['Authorization'] ?? '';
        calls.gateway.push(bearer);
        return session(bearer.replace(/^Bearer /, ''));
      }
      calls.n8n.push({ headers, body: String(init?.body ?? '') });
      return agent();
    }) as typeof fetch,
  };
  return { d, calls };
}

test('without a webhook URL the agent answers 503', async () => {
  const { d } = deps({ env: { GATEWAY_URL: GATEWAY } });
  const res = await handleChat(chatRequest(), d);
  assert.equal(res.status, 503);
});

test('a malformed payload is refused with 400 and nothing is forwarded', async () => {
  const { d, calls } = deps();
  const res = await handleChat(chatRequest('not json'), d);
  assert.equal(res.status, 400);
  assert.equal(calls.n8n.length, 0);
});

test('a valid chat is forwarded to n8n with only the two fields and the webhook secret', async () => {
  const { d, calls } = deps({ env: { N8N_WEBHOOK_URL: WEBHOOK, N8N_WEBHOOK_SECRET: 's3cret', GATEWAY_URL: GATEWAY } });
  const res = await handleChat(chatRequest({ chatInput: 'hi', sessionId: 'session-1', extra: 'dropped' }), d);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { output: 'Merhaba' });
  assert.equal(calls.n8n.length, 1);
  assert.equal(calls.n8n[0].headers['X-Webhook-Secret'], 's3cret');
  assert.deepEqual(JSON.parse(calls.n8n[0].body), { chatInput: 'hi', sessionId: 'session-1' });
});

test('an unreachable agent answers 502', async () => {
  const { d } = deps({ agent: () => { throw new Error('down'); } });
  const res = await handleChat(chatRequest(), d);
  assert.equal(res.status, 502);
});

test('without a CRM session cookie the chat is refused with 401 and nothing reaches n8n', async () => {
  const { d, calls } = deps();
  const res = await handleChat(chatRequest(undefined, {}), d);
  assert.equal(res.status, 401);
  assert.equal(calls.n8n.length, 0);
});

test('a session the gateway does not honour (expired, revoked) is refused with 401', async () => {
  const { d, calls } = deps({ session: () => new Response(null, { status: 401 }) });
  const res = await handleChat(chatRequest(), d);
  assert.equal(res.status, 401);
  assert.equal(calls.n8n.length, 0);
});

test('a signed-in account that is not an ADMIN gets 403: the agent runs with admin rights', async () => {
  const { d, calls } = deps({ session: () => Response.json({ username: 'user1', role: 'USER' }) });
  const res = await handleChat(chatRequest(), d);
  assert.equal(res.status, 403);
  assert.equal(calls.n8n.length, 0);
});

test('when the gateway cannot be reached the chat answers 503, not a guess', async () => {
  const { d, calls } = deps({ session: () => { throw new Error('connect refused'); } });
  const res = await handleChat(chatRequest(), d);
  assert.equal(res.status, 503);
  assert.equal(calls.n8n.length, 0);
});

test('an ADMIN session is checked with the gateway using the cookie token, then the chat is forwarded', async () => {
  const { d, calls } = deps();
  const res = await handleChat(chatRequest(), d);
  assert.equal(res.status, 200);
  assert.deepEqual(calls.gateway, ['Bearer tok-admin']);
  assert.equal(calls.n8n.length, 1);
});

test('the rate limit follows the signed-in user: changing X-Forwarded-For does not give a new allowance', async () => {
  const { d } = deps();
  const statuses: number[] = [];
  for (let i = 0; i < 16; i++) {
    const res = await handleChat(chatRequest(undefined, { ...COOKIE, 'x-forwarded-for': `203.0.113.${i}` }), d);
    statuses.push(res.status);
  }
  assert.equal(statuses[14], 200);
  assert.equal(statuses[15], 429);
});

test('one user hitting the limit does not block another admin', async () => {
  const { d } = deps({
    session: (token) => Response.json({ username: token === 'tok-admin' ? 'admin' : 'admin2', role: 'ADMIN' }),
  });
  for (let i = 0; i < 15; i++) await handleChat(chatRequest(), d);
  assert.equal((await handleChat(chatRequest(), d)).status, 429);
  const other = await handleChat(chatRequest(undefined, { cookie: 'customer_session=tok-other' }), d);
  assert.equal(other.status, 200);
});

test('an error answer from n8n is not passed on to the browser', async () => {
  const { d } = deps({
    agent: () => Response.json({ code: 500, message: 'Workflow execution failed at node "Gateway Girişi"' }, { status: 500 }),
  });
  const res = await handleChat(chatRequest(), d);
  assert.equal(res.status, 502);
  assert.doesNotMatch(await res.text(), /Gateway Giri/);
});

test('conversation ids are unguessable: not a timestamp, and different even within one millisecond', () => {
  const a = newSessionId();
  const b = newSessionId();
  assert.notEqual(a, b);
  assert.match(a, /^session-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
});
