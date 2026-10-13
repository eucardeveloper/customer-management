import { test, expect, Page } from '@playwright/test';

const API = process.env.API_URL ?? 'http://localhost:8080';
const ADMIN = { user: process.env.E2E_ADMIN_USER ?? 'admin', pass: process.env.E2E_ADMIN_PASS ?? 'admin123' };

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
  // text columns are left-aligned (never centred) and the table has rows
  expect(await header.evaluate((el) => getComputedStyle(el).textAlign)).toMatch(/left|start/);
  expect(await page.getByRole('row').count()).toBeGreaterThan(1);
});

test('changing a password ends every older session', async ({ page, request }) => {
  const name = `e2e_${Date.now()}`;
  const oldPass = 'OldPass-12345';
  const newPass = 'NewPass-67890';

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
