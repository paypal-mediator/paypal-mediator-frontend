import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../src/lib/api.js';
import { bootstrapWorkspace } from '../src/lib/workspace-bootstrap.js';
import { workspacePrepared } from '../src/lib/workspace-data.js';

const location = { pathname: '/transactions', search: '', origin: 'https://app.test' };
const team = id => ({ id, displayName: id });

test('startup preloads every listed team and preserves the selected team with separate caches', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, headers: options.headers });
    return Response.json(url.endsWith('/merchants') ? { items: [team('alpha'), team('beta')] } : { items: [], paypal: {}, total: 0 });
  };
  try {
    const api = createApi({ baseUrl: 'https://api.test/api', getAccessToken: async () => 'MOCK' });
    const Component = () => null;
    const result = await bootstrapWorkspace({ api, userId: 'user', location, storage: { getItem: () => 'beta' }, loadComponent: async () => ({ default: Component }) });
    assert.equal(result.Component, Component);
    assert.equal(result.selectedTeamId, 'beta');
    assert.equal(workspacePrepared(result.teamApi, { page: 'transactions' }), true);
    assert.equal(result.teamApis.size, 2);
    for (const id of ['alpha', 'beta']) assert.equal(workspacePrepared(result.teamApis.get(id), { page: 'overview' }), true);
    assert.notEqual(result.teamApis.get('alpha').resources, result.teamApis.get('beta').resources);
    assert.equal(calls.filter(call => call.url.endsWith('/merchants')).length, 1);
    for (const id of ['alpha', 'beta']) assert.equal(calls.filter(call => call.url.endsWith('/merchants/me') && call.headers['X-Merchant-Id'] === id).length, 1);
    assert.ok(calls.filter(call => !call.url.endsWith('/merchants')).every(call => ['alpha', 'beta'].includes(call.headers['X-Merchant-Id'])));
    const fallback = await bootstrapWorkspace({ api, userId: 'user', location, storage: { getItem: () => 'unauthorized-team' }, loadComponent: async () => ({ default: Component }) });
    assert.equal(fallback.selectedTeamId, 'alpha');
  } finally { globalThis.fetch = original; }
});

test('startup without memberships returns the account view without merchant requests', async () => {
  const controller = new AbortController();
  let scopeRequests = 0;
  const api = { merchants: async () => ({ items: [] }), forMerchant: () => { scopeRequests++; } };
  const result = await bootstrapWorkspace({ api, userId: 'user', location, storage: { getItem: () => { throw new Error('Storage unavailable'); } }, signal: controller.signal, loadComponent: async () => ({ default: 'MOCK_COMPONENT' }) });
  assert.equal(result.teamApi, null);
  assert.equal(result.teamApis.size, 0);
  assert.equal(result.selectedTeamId, null);
  assert.equal(scopeRequests, 0);
  controller.abort();
  await assert.rejects(bootstrapWorkspace({ api, userId: 'user', location, storage: {}, signal: controller.signal, loadComponent: async () => ({ default: 'MOCK_COMPONENT' }) }), error => error.name === 'AbortError');
});

test('a failed read for one team does not discard the other team preloads', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/merchants')) return Response.json({ items: [team('alpha'), team('beta')] });
    if (url.endsWith('/merchants/me') && options.headers['X-Merchant-Id'] === 'beta') return Response.json({ message: 'MOCK team unavailable' }, { status: 503 });
    return Response.json({ items: [], paypal: {}, total: 0 });
  };
  try {
    const api = createApi({ baseUrl: 'https://api.test/api', getAccessToken: async () => 'MOCK' });
    const result = await bootstrapWorkspace({ api, userId: 'user', location, storage: { getItem: () => 'alpha' }, loadComponent: async () => ({ default: 'MOCK_COMPONENT' }) });
    assert.equal(result.teamApis.get('alpha').resources.snapshot('merchant').error, null);
    assert.equal(result.teamApis.get('beta').resources.snapshot('merchant').error.status, 503);
    assert.equal(result.selectedTeamId, 'alpha');
  } finally { globalThis.fetch = original; }
});

test('a failed account read ends startup with an error instead of restarting its stages', async () => {
  let calls = 0;
  const api = { merchants: async () => { calls++; throw new Error('MOCK temporary failure'); } };
  await assert.rejects(bootstrapWorkspace({ api, userId: 'user', location, storage: {}, loadComponent: async () => ({ default: 'MOCK_COMPONENT' }) }), /MOCK temporary failure/);
  assert.equal(calls, 1);
});
