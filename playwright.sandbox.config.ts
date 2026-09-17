import { defineConfig } from '@playwright/test';
import type { LabOptions } from '@aqp/qa-framework-template/fixtures';
import type { LabProfileOptions } from './fixtures/lab.js';
import base from './playwright.config.js';

const commit = process.env.AQP_EXPECTED_APP_COMMIT;
if (!commit || !/^[a-f0-9]{40}$/.test(commit)) throw new Error('Trusted runner must supply the expected application commit');
export default defineConfig<LabOptions & LabProfileOptions>({
  ...base,
  workers: 1, fullyParallel: false, retries: 0, forbidOnly: true,
  reporter: [['json']],
  use: { ...base.use, channel: 'chromium', labProfile: 'isolated_postgres', expectedAppCommit: commit,
    labOrigin: 'http://127.0.0.1:3000', allowedOrigins: ['http://127.0.0.1:3000'],
    launchOptions: { chromiumSandbox: true }, serviceWorkers: 'block' },
});
