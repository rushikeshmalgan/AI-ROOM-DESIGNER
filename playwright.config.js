import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // the in-memory test DB (test/mocks/db.js) is one
                         // process-wide store, not isolated per test
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 45_000,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  expect: {
    timeout: 10_000,
  },
  // Single project, not a full browser/viewport matrix: every project
  // configured here runs against the SAME webServer instance (and thus
  // the same in-memory test/mocks/db.js store), so running chromium and
  // a mobile viewport together causes real cross-run data collisions,
  // not just extra runtime. Real mobile/touch behavior is covered by
  // docs/manual-qa-checklist.md against a real device instead — this
  // suite exists to catch frontend wiring regressions, not to duplicate
  // that.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // A production build, not `next dev` — dev mode compiles each route
    // on-demand on first visit, which made the very first hit to any
    // given route flaky against a fixed test timeout (a "cold" route
    // could take longer to compile than to actually run). A real build
    // removes that variable entirely; it costs time upfront per run
    // instead of unpredictably per-test.
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      PLAYWRIGHT_TEST_MODE: '1',
    },
  },
});
