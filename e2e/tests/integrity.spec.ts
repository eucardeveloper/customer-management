import { test, expect, APIRequestContext, Playwright } from '@playwright/test';

// Two properties that only show up with the whole stack running (gateway, auth, customer-service,
// order-service, two databases):
//   1. deleting a customer and adding an order for it at the same moment never leaves an order behind
//      that points at a customer who no longer exists;
//   2. every row of docs/ROLE-MATRIX.md holds for a real ADMIN, a real USER and an anonymous caller.

const API = process.env.API_URL ?? 'http://localhost:8080';
const ORIGIN = { Origin: 'http://localhost:3000' };
const ADMIN = { user: process.env.E2E_ADMIN_USER ?? 'admin', pass: process.env.E2E_ADMIN_PASS ?? 'admin123' };

async function signIn(request: APIRequestContext, username: string, password: string) {
  const res = await request.post(`${API}/api/auth/login`, { data: { username, password }, headers: ORIGIN });
  expect(res.ok(), `sign-in as ${username}`).toBeTruthy();
  const cookie = (await res.headersArray()).find((h) => h.name.toLowerCase() === 'set-cookie')!.value;
  return { Authorization: `Bearer ${cookie.match(/customer_session=([^;]+)/)![1]}` };
}

const newCustomer = (tag: string) => ({
  firstName: 'E2E', lastName: `${tag}-${Date.now()}`, email: `${tag}-${Date.now()}@example.com`, customerType: 'INDIVIDUAL',
});
const newOrder = (customerId: number, n = 1) => ({ customerId, productName: `e2e item ${n}`, price: 1, quantity: 1 });
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

test.describe('delete customer vs. add order, at the same moment', () => {
  test.setTimeout(180_000);

  test('no order is ever left pointing at a deleted customer', async ({ request }) => {
    const auth = await signIn(request, ADMIN.user, ADMIN.pass);
    const ROUNDS = 20;
    const outcomes = { deletedFirst: 0, orderKept: 0 };
    const leftovers: number[] = [];

    for (let i = 0; i < ROUNDS; i++) {
      const customer = await (await request.post(`${API}/api/customers`, { headers: auth, data: newCustomer('race') })).json();
      // the two calls start within a few milliseconds of each other, in a different order each round
      const jitter = Math.floor(Math.random() * 25);
      const del = (async () => { if (i % 2) await pause(jitter); return request.delete(`${API}/api/customers/${customer.id}`, { headers: auth }); })();
      const add = (async () => { if (!(i % 2)) await pause(jitter); return request.post(`${API}/api/orders`, { headers: auth, data: newOrder(customer.id) }); })();
      const [delRes, addRes] = await Promise.all([del, add]);

      // refusals are fine; a server error is not
      expect(delRes.status(), 'delete status').toBeLessThan(500);
      expect(addRes.status(), 'add-order status').toBeLessThan(500);

      // the stack may still be settling (a rolled-back order, a claim being released): wait for a stable state
      let customerGone = false;
      let orders: Array<{ id: number }> = [];
      for (let attempt = 0; attempt < 20; attempt++) {
        customerGone = (await request.get(`${API}/api/customers/${customer.id}`, { headers: auth })).status() === 404;
        orders = await (await request.get(`${API}/api/orders/customer/${customer.id}`, { headers: auth })).json();
        if (!(customerGone && orders.length > 0)) break;
        await pause(500);
      }

      // THE property: a deleted customer has no orders
      expect(customerGone && orders.length > 0, `round ${i}: customer ${customer.id} is gone but ${orders.length} order(s) remain`).toBe(false);

      if (customerGone) outcomes.deletedFirst++;
      else outcomes.orderKept++;
      if (!customerGone) leftovers.push(customer.id);
      for (const o of orders) await request.delete(`${API}/api/orders/${o.id}`, { headers: auth });
    }

    // clean up the customers that survived (their orders are already removed)
    for (const id of leftovers) {
      expect((await request.delete(`${API}/api/customers/${id}`, { headers: auth })).status()).toBe(204);
    }
    console.log(`race rounds: ${ROUNDS}, customer deleted: ${outcomes.deletedFirst}, customer kept with its order: ${outcomes.orderKept}`);
  });
});

test.describe('role matrix', () => {
  test.setTimeout(120_000);

  // One browser-like context per identity: each keeps its own session cookie, so "anonymous" really carries none.
  async function as(playwright: Playwright, username?: string, password?: string): Promise<APIRequestContext> {
    // a browser always sends Origin with a cookie-authenticated write; the gateway refuses writes without it
    const ctx = await playwright.request.newContext({ extraHTTPHeaders: ORIGIN });
    if (username) {
      const res = await ctx.post(`${API}/api/auth/login`, { data: { username, password }, headers: ORIGIN });
      expect(res.ok(), `sign-in as ${username}`).toBeTruthy();
    }
    return ctx;
  }

  test('ADMIN, USER and anonymous callers get the documented answer on every endpoint', async ({ playwright }) => {
    const anon = await as(playwright);
    const admin = await as(playwright, ADMIN.user, ADMIN.pass);

    // a throw-away USER
    const userName = `e2e_matrix_${Date.now() % 1000000}`;
    const userPass = 'E2e-Pass#2026';
    expect((await anon.post(`${API}/api/auth/register`, { data: { username: userName, email: `${userName}@example.com`, password: userPass }, headers: ORIGIN })).ok()).toBeTruthy();
    const user = await as(playwright, userName, userPass);

    // throw-away data the calls below may change or delete
    const customer = await (await admin.post(`${API}/api/customers`, { data: newCustomer('matrix') })).json();
    const order = await (await admin.post(`${API}/api/orders`, { data: newOrder(customer.id) })).json();
    const users: Array<{ id: number; username: string }> = await (await admin.get(`${API}/api/users`)).json();
    const userId = users.find((u) => u.username === userName)!.id;

    type Row = { name: string; method: 'get' | 'post' | 'put'; path: string; data?: unknown; admin: number; user: number; anon: number };
    // anonymous callers are turned away with 401; a signed-in USER is refused with 403
    const rows: Row[] = [
      { name: 'list customers', method: 'get', path: '/api/customers', admin: 200, user: 200, anon: 401 },
      { name: 'open a customer', method: 'get', path: `/api/customers/${customer.id}`, admin: 200, user: 200, anon: 401 },
      { name: 'list orders', method: 'get', path: '/api/orders', admin: 200, user: 200, anon: 401 },
      { name: 'open an order', method: 'get', path: `/api/orders/${order.id}`, admin: 200, user: 200, anon: 401 },
      { name: "a customer's orders", method: 'get', path: `/api/orders/customer/${customer.id}`, admin: 200, user: 200, anon: 401 },
      { name: 'list users', method: 'get', path: '/api/users', admin: 200, user: 403, anon: 401 },
      { name: 'create a customer', method: 'post', path: '/api/customers', data: newCustomer('nope'), admin: 201, user: 403, anon: 401 },
      { name: 'edit a customer', method: 'put', path: `/api/customers/${customer.id}`, data: newCustomer('edit'), admin: 200, user: 403, anon: 401 },
      { name: 'create an order', method: 'post', path: '/api/orders', data: newOrder(customer.id, 9), admin: 201, user: 403, anon: 401 },
      { name: 'edit an order', method: 'put', path: `/api/orders/${order.id}`, data: newOrder(customer.id, 2), admin: 200, user: 403, anon: 401 },
      { name: 'add a user', method: 'post', path: '/api/users', data: { username: `x${Date.now() % 100000}`, email: `x${Date.now()}@example.com`, password: 'E2e-Pass#2026', role: 'USER' }, admin: 201, user: 403, anon: 401 },
    ];

    const created: Array<{ kind: 'customer' | 'order' | 'user'; id: number }> = [];
    for (const r of rows) {
      // anonymous and USER first, so a wrongly allowed write would show up before the admin call
      expect((await anon[r.method](`${API}${r.path}`, { data: r.data })).status(), `anonymous: ${r.name}`).toBe(r.anon);
      expect((await user[r.method](`${API}${r.path}`, { data: r.data })).status(), `USER: ${r.name}`).toBe(r.user);
      const res = await admin[r.method](`${API}${r.path}`, { data: r.data });
      expect(res.status(), `ADMIN: ${r.name}`).toBe(r.admin);
      if (r.method === 'post' && r.path === '/api/customers') created.push({ kind: 'customer', id: (await res.json()).id });
      if (r.method === 'post' && r.path === '/api/orders') created.push({ kind: 'order', id: (await res.json()).id });
      if (r.method === 'post' && r.path === '/api/users') created.push({ kind: 'user', id: (await res.json()).id });
    }

    // deletes: anonymous and USER are refused (nothing is deleted yet)
    for (const [name, path] of [['delete an order', `/api/orders/${order.id}`], ['delete a customer', `/api/customers/${customer.id}`], ['delete a user', `/api/users/${userId}`]] as const) {
      expect((await anon.delete(`${API}${path}`)).status(), `anonymous: ${name}`).toBe(401);
      expect((await user.delete(`${API}${path}`)).status(), `USER: ${name}`).toBe(403);
    }

    // prices are financial data: only ADMIN receives them
    const asAdmin = await (await admin.get(`${API}/api/orders/${order.id}`)).json();
    const asUser = await (await user.get(`${API}/api/orders/${order.id}`)).json();
    expect(asAdmin.price).not.toBeNull();
    expect(asUser.price ?? null).toBeNull();

    // changing a role ends that account's sessions (tokenVersion), so it is checked last
    const role = { data: { role: 'USER' } };
    expect((await anon.patch(`${API}/api/users/${userId}/role`, role)).status(), 'anonymous: change a role').toBe(401);
    expect((await user.patch(`${API}/api/users/${userId}/role`, role)).status(), 'USER: change a role').toBe(403);
    expect((await admin.patch(`${API}/api/users/${userId}/role`, role)).status(), 'ADMIN: change a role').toBe(200);

    // clean up: orders first, then customers, then users
    for (const c of created.filter((x) => x.kind === 'order')) await admin.delete(`${API}/api/orders/${c.id}`);
    expect((await admin.delete(`${API}/api/orders/${order.id}`)).status()).toBe(204);
    for (const c of created.filter((x) => x.kind === 'customer')) await admin.delete(`${API}/api/customers/${c.id}`);
    expect((await admin.delete(`${API}/api/customers/${customer.id}`)).status()).toBe(204);
    for (const c of created.filter((x) => x.kind === 'user')) await admin.delete(`${API}/api/users/${c.id}`);
    expect((await admin.delete(`${API}/api/users/${userId}`)).status()).toBe(204);
    await Promise.all([anon.dispose(), admin.dispose(), user.dispose()]);
  });
});
