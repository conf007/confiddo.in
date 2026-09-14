import { defineConfig, devices } from '@playwright/test'

/**
 * Browser E2E (Layer 2). Runs against the BUILT app (vite preview) pointed at a real backend
 * booted by e2e/run.sh (or a staging pair via E2E_BASE_URL / E2E_WEB_URL).
 * Refuses production at startup (e2e/fixtures.ts).
 */
const WEB_URL = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './e2e/specs',
  testIgnore: process.env.E2E_ADMIN ? [] : ['**/admin-panel.spec.ts'],
  timeout: 90_000,
  expect: { timeout: 10_000 },
  retries: 1,                                    // one retry; traces/screenshots explain the first failure
  workers: 1,                                    // journeys share one seeded backend; keep them ordered
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'budget-phone',
      testMatch: /student-core-loop\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: process.env.E2E_WEB_URL
    ? undefined
    : {
        command: 'npx vite preview --port 4173 --strictPort --host 127.0.0.1',
        url: 'http://127.0.0.1:4173/app/',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
})
