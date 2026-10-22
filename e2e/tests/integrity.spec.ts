import { test, expect, APIRequestContext } from '@playwright/test';

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

  test('ADMIN, USER and anonymous callers get the documented answer on every endpoint', async ({ request }) => {
    const admin = await signIn(request, ADMIN.user, ADMIN.pass);

    // a throw-away USER
    const userName = `e2e_matrix_${Date.now() % 1000000}`;
    const userPass = 'E2e-Pass#2026';
    expect((await request.post(`${API}/api/auth/register`, { data: { username: userName, email: `${userName}@example.com`, password: userPass }, headers: ORIGIN })).ok()).toBeTruthy();
    const user = await signIn(request, userName, userPass);

    // throw-away data the calls below may change or delete
    const customer = await (await request.post(`${API}/api/customers`, { headers: admin, data: newCustomer('matrix') })).json();
    const order = await (await request.post(`${API}/api/orders`, { headers: admin, data: newOrder(customer.id) })).json();
    const users: Array<{ id: number; username: string }> = await (await request.get(`${API}/api/users`, { headers: admin })).json();
    const userId = users.find((u) => u.username === userName)!.id;

    type Row = { name: string; method: 'get' | 'post' | 'put' | 'patch' | 'delete'; path: string; data?: unknown; admin: number | number[]; user: number; anon: number };
    // anonymous callers are turned away at the gateway with 401; a signed-in USER is refused with 403
    const reads: Row[] = [
      { name: 'list customers', method: 'get', path: '/api/customers', admin: 200, user: 200, anon: 401 },
      { name: 'open a customer', method: 'get', path: `/api/customers/${customer.id}`, admin: 200, user: 200, anon: 401 },
      { name: 'list orders', method: 'get', path: '/api/orders', admin: 200, user: 200, anon: 401 },
      { name: 'open an order', method: 'get', path: `/api/orders/${order.id}`, admin: 200, user: 200, anon: 401 },
      { name: "a customer's orders", method: 'get', path: `/api/orders/customer/${customer.id}`, admin: 200, user: 200, anon: 401 },
      { name: 'list users', method: 'get', path: '/api/users', admin: 200, user: 403, anon: 401 },
    ];
    const writesRefusedForUser: Row[] = [
      { name: 'create a customer', method: 'post', path: '/api/customers', data: newCustomer('nope'), admin: 201, user: 403, anon: 401 },
      { name: 'edit a customer', method: 'put', path: `/api/customers/${customer.id}`, data: newCustomer('edit'), admin: 200, user: 403, anon: 401 },
      { name: 'create an order', method: 'post', path: '/api/orders', data: newOrder(customer.id, 9), admin: 201, user: 403, anon: 401 },
      { name: 'edit an order', method: 'put', path: `/api/orders/${order.id}`, data: newOrder(customer.id, 2), admin: 200, user: 403, anon: 401 },
      { name: 'add a user', method: 'post', path: '/api/users', data: { username: `x${Date.now() % 100000}`, email: `x${Date.now()}@example.com`, password: 'E2e-Pass#2026', role: 'USER' }, admin: 201, user: 403, anon: 401 },
    ];

    const call = (who: 'admin' | 'user' | 'anon', r: Row) => {
      const headers = who === 'admin' ? admin : who === 'user' ? user : {};
      return request[r.method](`${API}${r.path}`, { headers, data: r.data });
    };

    const createdByMatrix: Array<{ kind: 'customer' | 'order' | 'user'; id: number }> = [];
    for (const r of [...reads, ...writesRefusedForUser]) {
      // USER and anonymous first, so a wrongly allowed write would show up before the admin call
      expect((await call('anon', r)).status(), `anonymous: ${r.name}`).toBe(r.anon);
      expect((await call('user', r)).status(), `USER: ${r.name}`).toBe(r.user);
      const res = await call('admin', r);
      expect(res.status(), `ADMIN: ${r.name}`).toBe(r.admin);
      if (r.method === 'post' && r.path === '/api/customers') createdByMatrix.push({ kind: 'customer', id: (await res.json()).id });
      if (r.method === 'post' && r.path === '/api/orders') createdByMatrix.push({ kind: 'order', id: (await res.json()).id });
      if (r.method === 'post' && r.path === '/api/users') createdByMatrix.push({ kind: 'user', id: (await res.json()).id });
    }

    // deletes: USER and anonymous are refused, ADMIN may
    for (const [name, path] of [['delete an order', `/api/orders/${order.id}`], ['delete a customer', `/api/customers/${customer.id}`], ['delete a user', `/api/users/${userId}`]] as const) {
      expect((await request.delete(`${API}${path}`, { headers: {} })).status(), `anonymous: ${name}`).toBe(401);
      expect((await request.delete(`${API}${path}`, { headers: user })).status(), `USER: ${name}`).toBe(403);
    }

    // prices are financial data: only ADMIN receives them
    const asAdmin = await (await request.get(`${API}/api/orders/${order.id}`, { headers: admin })).json();
    const asUser = await (await request.get(`${API}/api/orders/${order.id}`, { headers: user })).json();
    expect(asAdmin.price).not.toBeNull();
    expect(asUser.price ?? null).toBeNull();

    // changing a role ends that account's sessions (tokenVersion), so it is checked last
    const role = { data: { role: 'USER' } };
    expect((await request.patch(`${API}/api/users/${userId}/role`, role)).status(), 'anonymous: change a role').toBe(401);
    expect((await request.patch(`${API}/api/users/${userId}/role`, { ...role, headers: user })).status(), 'USER: change a role').toBe(403);
    expect((await request.patch(`${API}/api/users/${userId}/role`, { ...role, headers: admin })).status(), 'ADMIN: change a role').toBe(200);

    // clean up: orders first, then customers, then users
    for (const c of createdByMatrix.filter((x) => x.kind === 'order')) await request.delete(`${API}/api/orders/${c.id}`, { headers: admin });
    expect((await request.delete(`${API}/api/orders/${order.id}`, { headers: admin })).status()).toBe(204);
    for (const c of createdByMatrix.filter((x) => x.kind === 'customer')) await request.delete(`${API}/api/customers/${c.id}`, { headers: admin });
    expect((await request.delete(`${API}/api/customers/${customer.id}`, { headers: admin })).status()).toBe(204);
    for (const c of createdByMatrix.filter((x) => x.kind === 'user')) await request.delete(`${API}/api/users/${c.id}`, { headers: admin });
    expect((await request.delete(`${API}/api/users/${userId}`, { headers: admin })).status()).toBe(204);
  });
});
