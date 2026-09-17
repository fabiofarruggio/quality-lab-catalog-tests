import { defineConfig } from '@playwright/test';
import type { LabOptions } from '@aqp/qa-framework-template/fixtures';
import manifest from './team-manifest.json' with { type: 'json' };
import { resolve } from 'node:path';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('node_modules/.cache/ms-playwright');
const channel = process.env.AQP_BROWSER_CHANNEL;
if (channel && !['chrome', 'msedge'].includes(channel)) throw new Error('AQP_BROWSER_CHANNEL must be chrome or msedge');

export default defineConfig<LabOptions>({
  testDir: './tests', fullyParallel: true, forbidOnly: true, retries: 0, workers: 2,
  projects: [{ name: 'api', testMatch: /.*\.api\.spec\.ts|readiness\.spec\.ts/ }, { name: 'chromium', testMatch: /.*\.ui\.spec\.ts/ }],
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }], ['html', { open: 'never' }]],
  use: { labOrigin: manifest.allowedEnvironmentOrigins[0], allowedOrigins: manifest.allowedEnvironmentOrigins, trace: 'off',
    channel, serviceWorkers: 'block' },
});
