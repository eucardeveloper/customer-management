import { defineConfig } from '@playwright/test';

// Runs against a stack that is already up (`docker compose up -d`). Override with BASE_URL / API_URL.
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  workers: 1, // the tests share one database
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
