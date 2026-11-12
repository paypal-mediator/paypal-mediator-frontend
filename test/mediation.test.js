import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../src/lib/api.js';

test('mediation uses authenticated merchant scope, actual dispute IDs and stable idempotency bodies', async () => {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, ...init }); return Response.json({ case: null, messages: [], policy: null }); };
  try {
    const api = createApi({ baseUrl: 'https://api.test/api', getAccessToken: async () => 'MOCK_TOKEN', merchantId: 'MOCK_MERCHANT' });
    await api.mediation('case/1'); await api.mediationPolicy();
    await api.saveMediationPolicy({ enabled: false });
    const message = { text: 'MOCK message', idempotencyKey: 'same-key' };
    await api.sendMediationMessage('case/1', message); await api.sendMediationMessage('case/1', message);
    await api.startMediation('case/1', { idempotencyKey: 'start-key', origin: 'manual', confirmed: true });
    await api.mediationAction('case/1', { action: 'CLAIM', idempotencyKey: 'claim-key' });
    await api.uploadMediationEvidence('case/1', { idempotencyKey: 'file-key', file: { dataBase64: 'MOCK' } });
    await api.refreshMediation('case/1');
    assert.equal(calls[0].url, 'https://api.test/api/disputes/case%2F1/mediation');
    assert.equal(calls[2].method, 'PUT'); assert.equal(calls[3].body, calls[4].body);
    assert.deepEqual(JSON.parse(calls[3].body), message);
    assert.equal(calls[7].url, 'https://api.test/api/disputes/case%2F1/mediation/evidence/files');
    assert.equal(calls[8].method, 'POST');
    for (const call of calls) { assert.equal(call.headers.Authorization, 'Bearer MOCK_TOKEN'); assert.equal(call.headers['X-Merchant-Id'], 'MOCK_MERCHANT'); }
    assert.ok(calls.every(call => !/refund|capture|transfer/.test(call.url)));
  } finally { globalThis.fetch = original; }
});
