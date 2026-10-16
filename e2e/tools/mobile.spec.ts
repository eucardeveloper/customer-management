import { test, expect, Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const OUT = path.resolve(__dirname, '../mobile-shots');
const DARK = process.env.COLOR_MODE === 'dark'; // COLOR_MODE=dark npm run mobile
const ADMIN = { user: process.env.E2E_ADMIN_USER ?? 'admin', pass: process.env.E2E_ADMIN_PASS ?? 'admin123' };

async function shot(page: Page, name: string, fullPage = false) {
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, `customer-mobile${DARK ? '-dark' : ''}-${name}.png`), fullPage });
}

// A card that starts or ends outside the phone is clipped by its scroll container, so the page-level
// overflow check below cannot see it. Closed drawers sit off-screen on purpose and are skipped.
async function clippedCards(page: import('@playwright/test').Page) {
  return page.evaluate(() => [...document.querySelectorAll('.MuiPaper-root, .MuiCard-root')]
    .filter((e) => !e.closest('.MuiDrawer-root') && !e.closest('.MuiPopover-root') && !e.closest('.MuiMenu-root'))
    .map((e) => ({ r: e.getBoundingClientRect(), t: (e.textContent || '').slice(0, 30) }))
    .filter(({ r }) => r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1))
    .map(({ r, t }) => `${t} [${Math.round(r.left)}..${Math.round(r.right)}]`));
}

test('phone screenshots of every screen', async ({ page }) => {
  if (DARK) await page.addInitScript(() => localStorage.setItem('colorMode', 'dark'));
  mkdirSync(OUT, { recursive: true });
  const problems: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${String(e)}`));

  await page.goto('/login');
  await shot(page, 'login');
  await page.getByPlaceholder('Username').fill(ADMIN.user);
  await page.getByPlaceholder('Password').fill(ADMIN.pass);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await shot(page, 'dashboard');
  expect(await clippedCards(page), 'dashboard cards run off the phone screen').toEqual([]);

  for (const [name, label] of [['customers', 'Customers'], ['orders', 'Orders'], ['analytics', 'Analytics'], ['users', 'User Management']]) {
    await page.getByRole('button', { name: 'toggle navigation' }).first().click();
    await page.getByRole('button', { name: label }).first().click();
    await shot(page, name);
    expect(await clippedCards(page), `${name} cards run off the phone screen`).toEqual([]);
  }

  // Sideways overflow of the page itself is a layout bug (tables may scroll inside their own box).
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'the page scrolls sideways by this many px').toBeLessThanOrEqual(1);
  console.log(problems.length ? `Browser saw problems:\n${problems.join('\n')}` : 'Browser saw no console errors.');
});
