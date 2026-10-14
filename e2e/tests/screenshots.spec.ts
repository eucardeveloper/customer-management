import { test, Page } from '@playwright/test';
import path from 'node:path';

// Not a test of behaviour: it takes the README screenshots from the running stack.
//   $env:SCREENSHOTS="1"; npx playwright test tests/screenshots.spec.ts      (PowerShell)
// Skipped otherwise, so a normal `playwright test` never rewrites files.
test.skip(!process.env.SCREENSHOTS, 'set SCREENSHOTS=1 to capture README screenshots');
test.use({ viewport: { width: 1440, height: 900 } });

const OUT = path.resolve(__dirname, '../../docs/screenshots');
const ADMIN = { user: process.env.E2E_ADMIN_USER ?? 'admin', pass: process.env.E2E_ADMIN_PASS ?? 'admin123' };

async function shot(page: Page, name: string) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `customer-${name}.png`) });
}

test('capture the screens', async ({ page }) => {
  await page.goto('/login');
  await shot(page, 'login');

  await page.getByPlaceholder('Username').fill(ADMIN.user);
  await page.getByPlaceholder('Password').fill(ADMIN.pass);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await shot(page, 'dashboard');

  // Each section is optional: a renamed tab must not stop the others from being captured.
  for (const [name, label] of [['customers', 'Customers'], ['orders', 'Orders'], ['analytics', 'Analytics'], ['users', 'User Management']]) {
    try {
      await page.getByRole('button', { name: label }).first().click({ timeout: 5000 });
      await shot(page, name);
    } catch {
      console.warn(`skipped: no such navigation button: ${label}`);
    }
  }
});
