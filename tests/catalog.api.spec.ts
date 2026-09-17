import { test, expect } from '../fixtures/lab.js';

test('QLAB-CAT-001: readiness and version expose honest local identity', async ({ lab }) => {
  const ready = await lab.get('/ready');
  expect(await ready.json()).toEqual({ ready: true, storeMode: 'isolated_test_double', seed: 'reference' });
  const version = await lab.get('/version');
  expect(version.status()).toBe(200);
  expect(await version.json()).toMatchObject({ appVersion: '0.1.0', seed: 'reference', storeMode: 'isolated_test_double', imageDigestVerified: false,
    mode: 'offline_replay', executionKind: 'deterministic_local', testStorage: 'isolated_test_double' });
  expect(JSON.stringify(await version.json())).not.toMatch(/password|token|secret/i);
});

test('QLAB-CAT-002: unauthenticated requests cannot read catalog', async ({ lab }) => {
  expect((await lab.get('/api/products')).status()).toBe(401);
});

test('QLAB-CAT-003: invalid credentials do not issue a token', async ({ lab }) => {
  const response = await lab.post('/api/auth/login', { username: 'reference-shopper', password: 'incorrect' });
  expect(response.status()).toBe(401);
  expect(await response.json()).not.toHaveProperty('token');
});

test('QLAB-CAT-004: seeded products have integer positive prices and active status', async ({ lab }) => {
  const shopper = await lab.asRole('shopper');
  const response = await shopper.get('/api/products');
  expect(response.status()).toBe(200);
  const { products } = await response.json();
  expect(products).toHaveLength(3);
  expect(products).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'p-notebook', priceCents: 2500, active: true, priceVersion: 1 }),
    expect.objectContaining({ id: 'p-keyboard', priceCents: 7500, active: true, priceVersion: 1 }),
    expect.objectContaining({ id: 'p-archived', priceCents: 1000, active: false, priceVersion: 1 }),
  ]));
});

test('QLAB-CAT-005: shopper cannot mutate a product and forbidden write leaves data intact', async ({ lab }) => {
  const shopper = await lab.asRole('shopper');
  expect((await shopper.patch('/api/products/p-notebook', { priceCents: 1 })).status()).toBe(403);
  expect((await (await shopper.get('/api/products')).json()).products).toContainEqual(expect.objectContaining({ id: 'p-notebook', priceCents: 2500, priceVersion: 1 }));
});

test('QLAB-CAT-006: catalog editor updates price and increments price version', async ({ lab }) => {
  const editor = await lab.asRole('catalog_editor');
  const response = await editor.patch('/api/products/p-notebook', { priceCents: 2600 });
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ product: { id: 'p-notebook', priceCents: 2600, priceVersion: 2 } });
});

for (const [suffix, price] of [['zero', 0], ['negative', -1], ['fraction', 0.5]] as const) {
  test(`QLAB-CAT-007-${suffix}: editor cannot store an invalid price`, async ({ lab }) => {
    const editor = await lab.asRole('catalog_editor');
    expect((await editor.patch('/api/products/p-notebook', { priceCents: price })).status()).toBe(400);
    expect((await (await editor.get('/api/products')).json()).products).toContainEqual(expect.objectContaining({ id: 'p-notebook', priceCents: 2500 }));
  });
}

for (const [subtotal, discount] of [[9999, 0], [10000, 1000], [10001, 1000]] as const) {
  test(`QLAB-CAT-008-${subtotal}: discount threshold uses server-side integer cents`, async ({ lab }) => {
    const editor = await lab.asRole('catalog_editor');
    expect((await editor.patch('/api/products/p-notebook', { priceCents: subtotal })).status()).toBe(200);
    const shopper = await lab.asRole('shopper');
    const response = await shopper.post('/api/quotes', { lines: [{ productId: 'p-notebook', quantity: 1 }] });
    expect(response.status()).toBe(201);
    expect(await response.json()).toMatchObject({ quote: { subtotalCents: subtotal, discountCents: discount, totalCents: subtotal - discount } });
  });
}

for (const quantity of [0, 11, 1.5]) {
  test(`QLAB-CAT-009-${quantity}: quote rejects invalid quantity`, async ({ lab }) => {
    const shopper = await lab.asRole('shopper');
    expect((await shopper.post('/api/quotes', { lines: [{ productId: 'p-notebook', quantity }] })).status()).toBe(400);
  });
}

test('QLAB-CAT-010: quantity boundaries 1 and 10 remain purchasable', async ({ lab }) => {
  const shopper = await lab.asRole('shopper');
  for (const quantity of [1, 10]) {
    const response = await shopper.post('/api/quotes', { lines: [{ productId: 'p-notebook', quantity }] });
    expect(response.status()).toBe(201);
    expect((await response.json()).quote.subtotalCents).toBe(2500 * quantity);
  }
});

test('QLAB-CAT-011: inactive product cannot be quoted', async ({ lab }) => {
  const shopper = await lab.asRole('shopper');
  const response = await shopper.post('/api/quotes', { lines: [{ productId: 'p-archived', quantity: 1 }] });
  expect(response.status()).toBe(409);
  expect(await response.json()).toEqual({ error: { code: 'PRODUCT_INACTIVE' } });
});

test('QLAB-CAT-012: changed price invalidates an existing quote', async ({ lab }) => {
  const shopper = await lab.asRole('shopper');
  const { quote } = await (await shopper.post('/api/quotes', { lines: [{ productId: 'p-notebook', quantity: 1 }] })).json();
  const editor = await lab.asRole('catalog_editor');
  expect((await editor.patch('/api/products/p-notebook', { priceCents: 2600 })).status()).toBe(200);
  const response = await shopper.post('/api/orders', { quoteId: quote.id, totalCents: quote.totalCents }, { 'Idempotency-Key': 'catalog-stale-price' });
  expect(response.status()).toBe(409);
  expect(await response.json()).toEqual({ error: { code: 'PRICE_CHANGED' } });
  expect((await (await shopper.get('/api/orders')).json()).orders).toEqual([]);
});

test('QLAB-CAT-013: client cannot override authoritative quote total', async ({ lab }) => {
  const shopper = await lab.asRole('shopper');
  const { quote } = await (await shopper.post('/api/quotes', { lines: [{ productId: 'p-notebook', quantity: 1 }] })).json();
  const response = await shopper.post('/api/orders', { quoteId: quote.id, totalCents: 1 }, { 'Idempotency-Key': 'catalog-tamper-total' });
  expect(response.status()).toBe(409);
  expect(await response.json()).toEqual({ error: { code: 'TOTAL_MISMATCH' } });
  expect((await (await shopper.get('/api/orders')).json()).orders).toEqual([]);
});

test('QLAB-CAT-014: identical confirmation key replays one order and changed body conflicts', async ({ lab }) => {
  const shopper = await lab.asRole('shopper');
  const { quote } = await (await shopper.post('/api/quotes', { lines: [{ productId: 'p-notebook', quantity: 1 }] })).json();
  const body = { quoteId: quote.id, totalCents: quote.totalCents };
  const headers = { 'Idempotency-Key': 'catalog-repeat-key' };
  const first = await shopper.post('/api/orders', body, headers);
  const second = await shopper.post('/api/orders', body, headers);
  expect(first.status()).toBe(201);
  expect(second.status()).toBe(200);
  const firstBody = await first.json();
  const secondBody = await second.json();
  expect(secondBody).toMatchObject({ replayed: true, order: { id: firstBody.order.id, totalCents: 2500 } });
  expect((await (await shopper.get('/api/orders')).json()).orders).toHaveLength(1);
  const changed = await shopper.post('/api/orders', { ...body, totalCents: 2501 }, headers);
  expect(changed.status()).toBe(409);
  expect(await changed.json()).toEqual({ error: { code: 'IDEMPOTENCY_CONFLICT' } });
  expect((await (await shopper.get('/api/orders')).json()).orders).toHaveLength(1);
});
