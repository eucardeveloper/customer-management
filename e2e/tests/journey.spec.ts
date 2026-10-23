import { test, expect, Page } from '@playwright/test';

const API = process.env.API_URL ?? 'http://localhost:8080';
const ADMIN = { user: process.env.E2E_ADMIN_USER ?? 'admin', pass: process.env.E2E_ADMIN_PASS ?? 'admin123' };

// Throw-away accounts created by a run; removed again in afterAll so the demo data stays clean.
const created: string[] = [];

test.afterAll(async ({ playwright }) => {
  const api = await playwright.request.newContext();
  try {
    const login = await api.post(`${API}/api/auth/login`, {
      data: { username: ADMIN.user, password: ADMIN.pass },
      headers: { Origin: 'http://localhost:3000' },
    });
    if (!login.ok()) return;
    const token = (await login.headersArray()).find((h) => h.name.toLowerCase() === 'set-cookie')!.value.match(/customer_session=([^;]+)/)![1];
    const auth = { Authorization: `Bearer ${token}` };
    const users: Array<{ id: number; username: string }> = await (await api.get(`${API}/api/users`, { headers: auth })).json();
    for (const u of users.filter((x) => created.includes(x.username))) {
      await api.delete(`${API}/api/users/${u.id}`, { headers: auth });
    }
  } finally {
    await api.dispose();
  }
});

async function signIn(page: Page, user: string, pass: string) {
  await page.goto('/login');
  await page.getByPlaceholder('Username').fill(user);
  await page.getByPlaceholder('Password').fill(pass);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

test('anonymous visitors are sent to the login page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
});

test('wrong password gives one generic error and no session', async ({ page }) => {
  await signIn(page, ADMIN.user, 'definitely-wrong');
  await expect(page).toHaveURL(/\/login/);
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === 'customer_session')).toBeUndefined();
});

test('admin sees the customers table with aligned columns', async ({ page }) => {
  await signIn(page, ADMIN.user, ADMIN.pass);
  await expect(page.getByRole('button', { name: 'Customers' })).toBeVisible();
  await page.getByRole('button', { name: 'Customers' }).click();
  const header = page.getByRole('columnheader', { name: 'Email' });
  await expect(header).toBeVisible();
  // header and data of a column share one alignment (every column centred; text sits left-aligned in a block centred in the column) and the table has rows
  expect(await header.evaluate((el) => getComputedStyle(el).textAlign)).toBe('center');
  const emailCell = page.getByRole('row').nth(1).getByRole('cell').nth(3);
  expect(await emailCell.evaluate((el) => getComputedStyle(el).textAlign)).toBe('center');
  expect(await page.getByRole('row').count()).toBeGreaterThan(1);
});

test('changing a password ends every older session', async ({ page, request }) => {
  const name = `e2e_${Date.now()}`;
  const oldPass = 'OldPass-12345';
  const newPass = 'NewPass-67890';
  created.push(name);

  const reg = await request.post(`${API}/api/auth/register`, {
    data: { username: name, email: `${name}@example.com`, password: oldPass },
  });
  expect(reg.ok()).toBeTruthy();

  await signIn(page, name, oldPass);
  await expect(page.getByText('Change password')).toBeVisible();

  const oldToken = (await page.context().cookies()).find((c) => c.name === 'customer_session')!.value;
  const before = await request.get(`${API}/api/customers`, { headers: { Authorization: `Bearer ${oldToken}` } });
  expect(before.status()).toBe(200);

  await page.getByText('Change password').first().click();
  await page.getByLabel('Current password').fill(oldPass);
  await page.getByLabel('New password', { exact: true }).fill(newPass);
  await page.getByLabel('Confirm new password').fill(newPass);
  await page.getByRole('button', { name: 'Change password' }).last().click();

  // the page signs the user out and returns to the login screen
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });

  // the old token stops working (the gateway caches a positive answer for up to ~10 s)
  await expect.poll(async () =>
    (await request.get(`${API}/api/customers`, { headers: { Authorization: `Bearer ${oldToken}` } })).status(),
    { timeout: 20_000, intervals: [1000] },
  ).toBe(401);

  // the old password no longer signs in, the new one does
  await signIn(page, name, oldPass);
  await expect(page).toHaveURL(/\/login/);
  await signIn(page, name, newPass);
  await expect(page).not.toHaveURL(/\/login/);
});

test('a customer who still has orders cannot be deleted through the API', async ({ request }) => {
  const login = await request.post(`${API}/api/auth/login`, {
    data: { username: ADMIN.user, password: ADMIN.pass },
    headers: { Origin: 'http://localhost:3000' },
  });
  expect(login.ok()).toBeTruthy();
  const token = (await login.headersArray()).find((h) => h.name.toLowerCase() === 'set-cookie')!.value.match(/customer_session=([^;]+)/)![1];
  const auth = { Authorization: `Bearer ${token}` };

  // customer #1 (seed data) has orders
  const res = await request.delete(`${API}/api/customers/1`, { headers: auth });
  expect(res.status()).toBe(409);

  // an order for a customer that does not exist is refused
  const bad = await request.post(`${API}/api/orders`, {
    headers: auth,
    data: { customerId: 999999, productName: 'ghost', price: 1, quantity: 1 },
  });
  expect(bad.status()).toBe(400);
});

test('deleting a customer: refused while orders exist, claim released, allowed once they are gone', async ({ request }) => {
  const login = await request.post(`${API}/api/auth/login`, {
    data: { username: ADMIN.user, password: ADMIN.pass },
    headers: { Origin: 'http://localhost:3000' },
  });
  expect(login.ok()).toBeTruthy();
  const token = (await login.headersArray()).find((h) => h.name.toLowerCase() === 'set-cookie')!.value.match(/customer_session=([^;]+)/)![1];
  const auth = { Authorization: `Bearer ${token}` };

  // a throw-away customer with one order (the seed data is never touched)
  const customer = await (await request.post(`${API}/api/customers`, {
    headers: auth,
    data: { firstName: 'E2E', lastName: `Delete-${Date.now()}`, email: 'e2e-delete@example.com', customerType: 'INDIVIDUAL' },
  })).json();
  const order = await (await request.post(`${API}/api/orders`, {
    headers: auth,
    data: { customerId: customer.id, productName: 'e2e item', price: 1, quantity: 1 },
  })).json();

  // refused, and the customer reads normally afterwards: the delete's claim was given back
  expect((await request.delete(`${API}/api/customers/${customer.id}`, { headers: auth })).status()).toBe(409);
  expect((await request.get(`${API}/api/customers/${customer.id}`, { headers: auth })).status()).toBe(200);
  // ... so a new order can still be attached to it
  const second = await request.post(`${API}/api/orders`, {
    headers: auth,
    data: { customerId: customer.id, productName: 'e2e item 2', price: 1, quantity: 1 },
  });
  expect(second.ok()).toBeTruthy();
  const secondOrder = await second.json();

  // once both orders are gone the customer can be deleted, and then it is gone
  expect((await request.delete(`${API}/api/orders/${order.id}`, { headers: auth })).status()).toBe(204);
  expect((await request.delete(`${API}/api/orders/${secondOrder.id}`, { headers: auth })).status()).toBe(204);
  expect((await request.delete(`${API}/api/customers/${customer.id}`, { headers: auth })).status()).toBe(204);
  expect((await request.get(`${API}/api/customers/${customer.id}`, { headers: auth })).status()).toBe(404);
});

test('a signed-in USER is refused with 403 (not 401) on admin-only calls', async ({ request }) => {
  const username = `e2e_user_${Date.now() % 1000000}`;
  const password = 'E2e-Pass#2026';
  created.push(username);
  const reg = await request.post(`${API}/api/auth/register`, {
    data: { username, email: `${username}@example.com`, password },
    headers: { Origin: 'http://localhost:3000' },
  });
  expect(reg.ok()).toBeTruthy();
  const login = await request.post(`${API}/api/auth/login`, {
    data: { username, password },
    headers: { Origin: 'http://localhost:3000' },
  });
  expect(login.ok()).toBeTruthy();
  const token = (await login.headersArray()).find((h) => h.name.toLowerCase() === 'set-cookie')!.value.match(/customer_session=([^;]+)/)![1];
  const auth = { Authorization: `Bearer ${token}` };

  expect((await request.get(`${API}/api/customers`, { headers: auth })).status()).toBe(200);
  const write = await request.post(`${API}/api/customers`, {
    headers: auth,
    data: { firstName: 'No', lastName: 'Access', email: 'no.access@example.com', customerType: 'INDIVIDUAL' },
  });
  expect(write.status()).toBe(403);
  expect((await request.get(`${API}/api/users`, { headers: auth })).status()).toBe(403);
});

test('an admin adds an ADMIN account from the Users page and stays signed in as themselves', async ({ page, request }) => {
  const name = `e2e_admin_${Date.now() % 1000000}`;
  created.push(name);

  await signIn(page, ADMIN.user, ADMIN.pass);
  await page.getByRole('button', { name: 'User Management' }).click();
  await page.getByRole('button', { name: 'Add User' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Username').fill(name);
  await dialog.getByLabel('Email').fill(`${name}@example.com`);
  await dialog.getByLabel('Password').fill('E2e-Admin#2026');
  await dialog.getByLabel('Role').click();
  await page.getByRole('option', { name: 'ADMIN' }).click();
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('User created.')).toBeVisible();

  // the browser session still belongs to the admin, not to the account just created
  const token = (await page.context().cookies()).find((c) => c.name === 'customer_session')!.value;
  const auth = { Authorization: `Bearer ${token}` };
  const session = await (await request.get(`${API}/api/auth/session`, { headers: auth })).json();
  expect(session).toEqual({ username: ADMIN.user, role: 'ADMIN' });

  // the account has the role that was chosen, and the page still lists users (an admin-only call)
  const users: Array<{ id: number; username: string; role: string }> = await (await request.get(`${API}/api/users`, { headers: auth })).json();
  const added = users.find((u) => u.username === name);
  expect(added?.role).toBe('ADMIN');
  await expect(page.getByRole('cell', { name: `${name}@example.com`, exact: true })).toBeVisible();

  // removed here, not only in afterAll: the last-administrator test below needs exactly one admin
  expect((await request.delete(`${API}/api/users/${added!.id}`, { headers: auth })).status()).toBe(204);
});

test('the last administrator cannot be demoted or deleted', async ({ request }) => {
  const login = await request.post(`${API}/api/auth/login`, {
    data: { username: ADMIN.user, password: ADMIN.pass },
    headers: { Origin: 'http://localhost:3000' },
  });
  expect(login.ok()).toBeTruthy();
  const token = (await login.headersArray()).find((h) => h.name.toLowerCase() === 'set-cookie')!.value.match(/customer_session=([^;]+)/)![1];
  const auth = { Authorization: `Bearer ${token}` };
  const users: Array<{ id: number; username: string; role: string }> = await (await request.get(`${API}/api/users`, { headers: auth })).json();
  const admins = users.filter((u) => u.role === 'ADMIN');
  test.skip(admins.length !== 1, 'only meaningful while exactly one administrator exists');

  const demote = await request.patch(`${API}/api/users/${admins[0].id}/role`, { headers: auth, data: { role: 'USER' } });
  expect(demote.status()).toBe(409);
  const remove = await request.delete(`${API}/api/users/${admins[0].id}`, { headers: auth });
  expect(remove.status()).toBe(409);
});

test('demoting or deleting an account ends its sessions, and a new account with the same name does not inherit them', async ({ request }) => {
  const tokenFor = async (user: string, pass: string) => {
    const res = await request.post(`${API}/api/auth/login`, {
      data: { username: user, password: pass },
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(res.ok(), `sign-in as ${user}`).toBeTruthy();
    const cookie = (await res.headersArray()).find((h) => h.name.toLowerCase() === 'set-cookie')!.value;
    return { Authorization: `Bearer ${cookie.match(/customer_session=([^;]+)/)![1]}` };
  };
  const adminAuth = await tokenFor(ADMIN.user, ADMIN.pass);
  const name = `e2e_rev_${Date.now() % 1000000}`;
  const pass = 'E2e-Revoke#2026';
  created.push(name);
  const create = (role: string) =>
    request.post(`${API}/api/users`, { headers: adminAuth, data: { username: name, password: pass, email: `${name}@example.com`, role } });
  // the gateway caches a positive answer for up to ~10 s, so every "stops working" check polls
  const status = (auth: { Authorization: string }, path: string) => async () => (await request.get(`${API}${path}`, { headers: auth })).status();

  // an ADMIN account signs in and may list users
  const made = await create('ADMIN');
  expect(made.status()).toBe(201);
  const account: { id: number } = await made.json();
  const adminToken = await tokenFor(name, pass);
  expect(await status(adminToken, '/api/users')()).toBe(200);

  // demoted to USER: the old administrator token stops working, a fresh sign-in has USER rights only
  const demote = await request.patch(`${API}/api/users/${account.id}/role`, { headers: adminAuth, data: { role: 'USER' } });
  expect(demote.status()).toBe(200);
  await expect.poll(status(adminToken, '/api/users'), { timeout: 20_000, intervals: [1000] }).not.toBe(200);
  const userToken = await tokenFor(name, pass);
  expect(await status(userToken, '/api/customers')()).toBe(200);
  expect(await status(userToken, '/api/users')()).toBe(403);

  // deleted: the session ends, and an account created later with the same name does not inherit it
  expect((await request.delete(`${API}/api/users/${account.id}`, { headers: adminAuth })).status()).toBe(204);
  await expect.poll(status(userToken, '/api/customers'), { timeout: 20_000, intervals: [1000] }).toBe(401);
  expect((await create('USER')).status()).toBe(201);
  expect(await status(userToken, '/api/customers')()).toBe(401);
  expect(await status(adminToken, '/api/users')()).not.toBe(200);
});
