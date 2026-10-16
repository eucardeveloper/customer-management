import { test, expect, Page } from '@playwright/test';
import path from 'node:path';

// Not a test of behaviour: it takes the README screenshots from the running stack.
//   npm run screenshots
// It lives outside tests/ and has its own config, so a normal `playwright test` never runs (or skips) it
// and never rewrites the files.
test.use({ viewport: { width: 1440, height: 1200 } });

const DARK = process.env.COLOR_MODE === 'dark'; // COLOR_MODE=dark npm run screenshots: written to e2e/mobile-shots, not the README folder
const OUT = DARK ? path.resolve(__dirname, '../mobile-shots') : path.resolve(__dirname, '../../docs/screenshots');
const ADMIN = { user: process.env.E2E_ADMIN_USER ?? 'admin', pass: process.env.E2E_ADMIN_PASS ?? 'admin123' };

async function shot(page: Page, name: string) {
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, `customer-${DARK ? 'desktop-dark-' : ''}${name}.png`) });
}

test('capture the screens', async ({ page }) => {
  if (DARK) await page.addInitScript(() => localStorage.setItem('colorMode', 'dark'));
  // A README picture of an empty dashboard is worse than no picture: record what the browser saw
  // and refuse to shoot a screen whose data requests failed.
  const problems: string[] = [];
  let ordersOk = 0;
  page.on('requestfailed', (r) => problems.push(`FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    if (r.url().includes('/api/orders') && r.request().method() === 'GET' && r.status() === 200) ordersOk++;
    if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.request().method()} ${r.url()}`);
  });
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });

  await page.goto('/login');
  await shot(page, 'login');

  await page.getByPlaceholder('Username').fill(ADMIN.user);
  await page.getByPlaceholder('Password').fill(ADMIN.pass);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await expect.poll(() => ordersOk, { timeout: 15_000, message: `orders never loaded. Seen: ${problems.join(' | ')}` }).toBeGreaterThan(0);
  await shot(page, 'dashboard');

  for (const [name, label] of [['customers', 'Customers'], ['orders', 'Orders'], ['analytics', 'Analytics'], ['users', 'User Management']]) {
    await page.getByRole('button', { name: label }).first().click();
    await shot(page, name);
  }
  console.log(problems.length ? `Browser saw problems:\n${problems.join('\n')}` : 'Browser saw no failed requests.');
});
