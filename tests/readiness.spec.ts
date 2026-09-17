import { test, expect } from '../fixtures/lab.js';

test('QLAB-CATALOG-READINESS: lab is ready', async ({ lab }) => {
  const response = await lab.get('/ready');
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ ready: true });
});
