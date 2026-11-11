import test from 'node:test';
import assert from 'node:assert/strict';
import { createResourceStore } from '../src/lib/resource-store.js';
import { createApi } from '../src/lib/api.js';
import { activityKey, disputeListKey, preloadWorkspace, transactionListKey } from '../src/lib/workspace-data.js';

const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test('concurrent readers share one request and remounts synchronously see its data', async () => {
  const store = createResourceStore();
  const pending = deferred();
  let calls = 0;
  const loader = () => { calls++; return pending.promise; };
  const first = store.load('list', loader), second = store.load('list', loader);
  assert.equal(first, second);
  pending.resolve({ items: ['one'] });
  await first;
  assert.deepEqual(store.snapshot('list'), { data: { items: ['one'] }, loading: false, error: null });
  await store.load('list', loader);
  assert.equal(calls, 1);
});

test('background refresh keeps the table visible and authorization failures clear its data', async () => {
  let clock = 0;
  const store = createResourceStore({ staleTime: 10, now: () => clock });
  await store.load('table', () => Promise.resolve(['previous']));
  clock = 11;
  const pending = deferred();
  const refresh = store.load('table', () => pending.promise);
  assert.equal(store.snapshot('table').loading, false);
  assert.deepEqual(store.snapshot('table').data, ['previous']);
  pending.resolve(['updated']);
  await refresh;
  const denied = Object.assign(new Error('Access revoked'), { status: 403 });
  await assert.rejects(store.load('table', () => Promise.reject(denied), { force: true }), /Access revoked/);
  assert.equal(store.snapshot('table').data, null);
});

test('invalidating after a write refreshes subscribers and ignores old in-flight results', async () => {
  const store = createResourceStore();
  const pending = deferred();
  const old = store.load('table', () => pending.promise);
  await Promise.resolve();
  store.invalidate();
  await store.load('table', () => Promise.resolve(['new revision']));
  pending.resolve(['obsolete revision']);
  await old;
  assert.deepEqual(store.snapshot('table').data, ['new revision']);
  let revisions = 0;
  await store.load('subscribed', () => Promise.resolve(++revisions));
  const unsubscribe = store.subscribe('subscribed', () => {});
  store.invalidate();
  await store.load('subscribed', () => Promise.resolve(++revisions));
  assert.equal(store.snapshot('subscribed').data, 2);
  unsubscribe();
});

test('workspace preloads main tables and settings together without duplicate overview queries', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(url);
    const path = new URL(url).pathname;
    if (path === '/api/billing/subscription') return new Response(null, { status: 404 });
    if (path === '/api/settings/integrations') return Response.json({ paypal: { connectionStatus: 'NOT_CONFIGURED' } });
    return Response.json({ items: [], total: 0, pageSize: 20 });
  };
  try {
    const root = createApi({ baseUrl: 'https://api.test/api', getAccessToken: async () => 'MOCK' });
    const api = root.forMerchant('team-a');
    await preloadWorkspace(api, { page: 'transactions' });
    for (const key of ['merchant', 'overview', transactionListKey(), disputeListKey(), activityKey(), 'settings:integrations', 'settings:billing']) {
      assert.equal(api.resources.snapshot(key).loading, false, key);
      assert.equal(api.resources.snapshot(key).error, null, key);
    }
    assert.equal(calls.filter(url => url.includes('/transactions?')).length, 1);
    assert.equal(calls.filter(url => url.includes('/disputes?')).length, 1);
    assert.equal(calls.filter(url => url.endsWith('/settings/integrations')).length, 1);
    assert.equal(root.forMerchant('team-b').resources.snapshot('merchant').data, null);
    assert.equal(root.resources.snapshot('merchant').data, null);
    await api.updateMerchant({ displayName: 'Updated' });
    assert.equal(api.resources.snapshot(transactionListKey()).data, null);
  } finally { globalThis.fetch = original; }
});

test('a failed preload section does not prevent the other tables from becoming available', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async url => url.includes('/disputes?')
    ? Response.json({ message: 'Disputes unavailable' }, { status: 503 })
    : Response.json({ items: [], paypal: {}, total: 0 });
  try {
    const api = createApi({ baseUrl: 'https://api.test/api', getAccessToken: async () => 'MOCK' });
    await preloadWorkspace(api, { page: 'transactions' });
    assert.equal(api.resources.snapshot(disputeListKey()).error.status, 503);
    assert.equal(api.resources.snapshot(transactionListKey()).error, null);
    assert.deepEqual(api.resources.snapshot(transactionListKey()).data.items, []);
  } finally { globalThis.fetch = original; }
});
