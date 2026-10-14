import { defineConfig } from '@playwright/test';

// Captures the README screenshots from a running stack (`npm run screenshots`). Not part of the test suite.
export default defineConfig({
  testDir: './tools',
  timeout: 120_000,
  workers: 1,
  reporter: [['list']],
  expect: { timeout: 15_000 },
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3000' },
});
