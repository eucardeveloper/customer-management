import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Minimal browser stand-ins so the modules run under plain node.
const g = globalThis as unknown as Record<string, unknown>;
const store = new Map<string, string>();
let redirectedTo: string | null = null;
g.localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
g.window = { location: { replace: (u: string) => { redirectedTo = u; } } };

const { api } = await import('../src/lib/api.ts');
const { saveAuth, getAuthUser, clearAuth, isAuthenticated, logout } = await import('../src/lib/auth.ts');

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];
function mockFetch(status: number, body: string) {
  calls = [];
  g.fetch = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(status === 204 ? null : body, { status });
  };
}

beforeEach(() => {
  store.clear();
  redirectedTo = null;
});

test('requests carry the session cookie and a JSON content type', async () => {
  mockFetch(200, '{"ok":true}');
  const result = await api.get<{ ok: boolean }>('/api/customers');
  assert.equal(result.ok, true);
  assert.equal(calls[0].init.credentials, 'include');
  assert.equal((calls[0].init.headers as Record<string, string>)['Content-Type'], 'application/json');
  assert.ok(calls[0].url.endsWith('/api/customers'));
});

test('writes use the right HTTP verb and a JSON body', async () => {
  mockFetch(200, '{}');
  await api.post('/api/orders', { a: 1 });
  await api.put('/api/orders/1', { a: 2 });
  await api.patch('/api/users/1/role', { role: 'ADMIN' });
  await api.delete('/api/orders/1');
  assert.deepEqual(calls.map((c) => c.init.method), ['POST', 'PUT', 'PATCH', 'DELETE']);
  assert.equal(calls[0].init.body, JSON.stringify({ a: 1 }));
});

test('a 401 forgets the local user and sends the browser to the login page', async () => {
  saveAuth({ username: 'ali', role: 'USER' });
  mockFetch(401, '');
  await assert.rejects(() => api.get('/api/customers'), /Unauthorized/);
  assert.equal(getAuthUser(), null);
  assert.equal(redirectedTo, '/login');
});

test('an error response surfaces the server message, falling back to the status', async () => {
  mockFetch(409, JSON.stringify({ message: 'Customer has orders' }));
  await assert.rejects(() => api.delete('/api/customers/1'), /Customer has orders/);
  mockFetch(500, '');
  await assert.rejects(() => api.get('/api/x'), /HTTP 500/);
});

test('an empty success body is an empty object, not a parse error', async () => {
  mockFetch(204, '');
  assert.deepEqual(await api.delete('/api/orders/9'), {});
});

test('only display data is stored locally, never a token', () => {
  saveAuth({ username: 'ali', role: 'ADMIN', token: 'secret' } as { username: string; role: string });
  assert.equal(store.get('auth_user'), JSON.stringify({ username: 'ali', role: 'ADMIN' }));
  assert.equal(isAuthenticated(), true);
  clearAuth();
  assert.equal(isAuthenticated(), false);
});

test('corrupt local data counts as signed out', () => {
  store.set('auth_user', '{not json');
  assert.equal(getAuthUser(), null);
});

test('logout calls the server with the cookie and clears local data even if the call fails', async () => {
  saveAuth({ username: 'ali', role: 'USER' });
  g.fetch = async () => { throw new Error('network down'); };
  await assert.rejects(() => logout(), /network down/);
  assert.equal(getAuthUser(), null);
  mockFetch(204, '');
  await logout();
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.credentials, 'include');
});
