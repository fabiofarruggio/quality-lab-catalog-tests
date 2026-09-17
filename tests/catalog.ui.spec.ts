import { test, expect } from '../fixtures/lab.js';
import type { Page } from '@playwright/test';

async function login(page: Page, role = 'shopper'): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Username', { exact: true }).fill(`reference-${role}`);
  await page.getByLabel('Password', { exact: true }).fill('synthetic-only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Catalog', exact: true })).toBeVisible();
}

test.beforeEach(async ({ context, localLab, browser }, testInfo) => {
  testInfo.annotations.push({ type: 'browser-version', description: browser.version() });
  await context.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localLab.url) await route.continue();
    else await route.abort('blockedbyclient');
  });
});

test('QLAB-CAT-UI-001: shopper sees synthetic catalog and cannot purchase inactive item', async ({ page, localLab }) => {
  await login(page);
  await expect(page.getByLabel('Environment details')).toContainText(localLab.storeMode === 'postgres'
    ? 'Local PostgreSQL laboratory' : 'Test double — not PostgreSQL evidence');
  await expect(page.locator('article.product')).toHaveCount(3);
  await expect(page.locator('#quantity-p-archived')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save p-notebook' })).toHaveCount(0);
});

test('QLAB-CAT-UI-002: quoted discount and repeated confirmation preserve one order', async ({ page }, testInfo) => {
  await login(page);
  await page.locator('#quantity-p-notebook').fill('4');
  await page.getByRole('button', { name: 'Request quote', exact: true }).click();
  await expect(page.getByTestId('quote-total')).toHaveText('9000 cents');
  await page.getByRole('button', { name: 'Confirm order', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Order confirmed:');
  const order = await page.locator('ul li code').textContent();
  await page.getByRole('button', { name: 'Confirm order', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Existing order returned:');
  await expect(page.locator('ul li')).toHaveCount(1);
  await expect(page.locator('ul li code')).toHaveText(order!);
  await page.screenshot({ path: testInfo.outputPath('catalog-checkout.png'), fullPage: true });
});

test('QLAB-CAT-UI-003: changed catalog price surfaces stale quote instead of confirming', async ({ page, lab }) => {
  await login(page);
  await page.locator('#quantity-p-notebook').fill('1');
  await page.getByRole('button', { name: 'Request quote', exact: true }).click();
  await expect(page.getByTestId('quote-total')).toHaveText('2500 cents');
  const editor = await lab.asRole('catalog_editor');
  expect((await editor.patch('/api/products/p-notebook', { priceCents: 2600 })).status()).toBe(200);
  await page.getByRole('button', { name: 'Confirm order', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('PRICE_CHANGED — Request a new quote before confirming.');
  await expect(page.locator('ul li')).toHaveCount(0);
});

test('QLAB-CAT-UI-004: editor changes price while shopper-only checkout stays unavailable', async ({ page }) => {
  await login(page, 'catalog_editor');
  const product = page.locator('article.product').filter({ has: page.getByRole('heading', { name: 'Field notebook', exact: true }) });
  await product.getByLabel('Price in cents', { exact: true }).fill('2600');
  await product.getByRole('button', { name: 'Save p-notebook', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('price version 2');
  await expect(product.locator('.price')).toContainText('2,600');
  await expect(page.getByRole('button', { name: 'Request quote', exact: true })).toHaveCount(0);
});
