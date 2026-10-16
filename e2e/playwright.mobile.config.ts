import { defineConfig } from '@playwright/test';

// Takes phone-sized screenshots of every screen from a running stack (`npm run mobile`) so the layout can be
// reviewed. Not part of the test suite; the pictures go to e2e/mobile-shots/ (git-ignored).
export default defineConfig({
  testDir: './tools',
  testMatch: 'mobile.spec.ts',
  timeout: 120_000,
  workers: 1,
  reporter: [['list']],
  expect: { timeout: 15_000 },
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3000' },
});
