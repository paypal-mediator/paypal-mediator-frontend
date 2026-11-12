import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAllPages, loadActivity, loadTransactions, transactionKey } from '../src/lib/workspace-data.js';
import { createResourceStore } from '../src/lib/resource-store.js';

test('tables retain every page in server order after pagination controls are removed', async () => {
  const calls = [];
  const result = await loadAllPages(async ({ page, pageSize }) => {
    calls.push([page, pageSize]);
    await new Promise(resolve => setTimeout(resolve, page % 2));
    return { items: [page], pageSize: 100, total: 450 };
  });
  assert.deepEqual(result.items, [1, 2, 3, 4, 5]);
  assert.equal(calls.length, 5);
});

test('activity search includes older cursor pages', async () => {
  const api = { activity: async ({ beforeId }) => beforeId ? { items: [{ id: 'older' }], nextCursor: null } : { items: [{ id: 'latest' }], nextCursor: { before: '2026-11-10T00:00:00Z', beforeId: 'cursor' } } };
  const result = await loadActivity(api);
  assert.deepEqual(result.items.map(item => item.id), ['latest', 'older']);
  assert.equal(result.nextCursor, null);
});

test('transaction list primes the exact detail cache without another request', async () => {
  const transaction = { id: 'tx', paypalCaptureId: 'CAPTURE' };
  const api = { resources: createResourceStore(), transactions: async () => ({ items: [transaction], total: 1, pageSize: 100 }) };
  await loadTransactions(api);
  assert.equal(api.resources.snapshot(transactionKey('tx')).data, transaction);
  assert.equal(api.resources.snapshot(transactionKey('tx')).loading, false);
});
