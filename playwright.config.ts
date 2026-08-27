import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
// 127.0.0.1 rather than localhost: on Windows and on some Node versions
// `localhost` resolves to ::1 first, and Wrangler listens on IPv4 only.
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    // The audience is on mobile data; assert the experience they actually get.
    locale: 'pt-BR',
  },

  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],

  // Tests run against the real static build served by Cloudflare's own local
  // emulator, so what CI verifies is what Cloudflare Pages will actually serve.
  //
  // `astro preview` was used here before and could not catch two production bugs,
  // because it ignores `public/_headers` and has no 404 fallback:
  //   - the CSP was missing 'wasm-unsafe-eval', so Pagefind's WASM index refused
  //     to instantiate and search returned nothing in production;
  //   - a missing URL was answered with the home page at HTTP 200.
  // `wrangler pages dev` applies `_headers` and the 404 fallback with Cloudflare's
  // own implementation, so the suite tests their behaviour rather than our reading
  // of the spec.
  webServer: {
    command: [
      'npm run build',
      // Pinned compatibility date: keeps the emulator deterministic across runs
      // and silences Wrangler's "no compatibility_date" warning.
      `npx wrangler pages dev dist --ip 127.0.0.1 --port ${PORT}` +
        ' --compatibility-date=2026-08-26 --show-interactive-dev-session=false',
    ].join(' && '),
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    stdout: 'pipe',
  },
});
