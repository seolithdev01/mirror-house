// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: 1,
  // CI runs one worker: GitHub's 4-vCPU runner shares its CPU between the
  // Vite dev server and software-rendered WebGL, and two parallel workers
  // made frame timing swing enough to break timing-sensitive tests
  // (e2e runs took 300–560 s, failing on the slow ones).
  workers: process.env.CI ? 1 : undefined,
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
