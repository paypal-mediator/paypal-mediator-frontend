import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../src/lib/api.js';
import { canUseRun, evidenceUploadBody, MAX_EVIDENCE_FILE_BYTES } from '../src/lib/live.js';
import { money, transactionSubtitle } from '../src/lib/format.js';

async function intercept(run, response = () => Response.json({ items: [] })) {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, ...options }); return response(url, options); };
  try { await run(createApi({ baseUrl: 'https://api.test/api/', getAccessToken: async () => 'session-token' }), calls); }
  finally { globalThis.fetch = original; }
}

test('PayPal onboarding remains scoped to the selected business and never submits browser consent flags', async () => {
  await intercept(async (api, calls) => {
    const business = api.forMerchant('business-id');
    await business.connectPayPal(); await business.completePayPal(); await business.disconnectPayPal();
    assert.deepEqual(calls.map(call => call.url), ['connect', 'complete', 'disconnect'].map(action => `https://api.test/api/settings/integrations/paypal/${action}`));
    for (const call of calls) { assert.equal(call.method, 'POST'); assert.equal(call.headers['X-Merchant-Id'], 'business-id'); assert.equal(call.headers.Authorization, 'Bearer session-token'); assert.equal(call.body, undefined); }
  });
});
test('live API scopes requests to bearer auth and allowlisted server filters', async () => {
  await intercept(async (api, calls) => {
    await api.transactions({ page: 2, pageSize: 20, paypalCaptureId: 'CAPTURE/1', readiness: 'READY', merchantId: 'not-a-header' });
    await api.disputes({ page: 3, internalState: 'NEEDS_REVIEW', paypalStatus: 'OPEN', unsupported: true });
    await api.activity({ module: 'M05', limit: 30, before: '2026-11-10T00:00:00Z', beforeId: 'cursor', unsupported: true });
    assert.equal(calls[0].url, 'https://api.test/api/transactions?page=2&pageSize=20&paypalCaptureId=CAPTURE%2F1');
    assert.equal(calls[1].url, 'https://api.test/api/disputes?page=3&pageSize=20&internalState=NEEDS_REVIEW&paypalStatus=OPEN');
    assert.ok(calls[2].url.includes('beforeId=cursor'));
    assert.ok(!calls[2].url.includes('unsupported'));
    for (const call of calls) assert.deepEqual(call.headers, { Authorization: 'Bearer session-token' });
  });
});
test('submission and AI writes retain caller idempotency keys and send exact public bodies', async () => {
  await intercept(async (api, calls) => {
    await api.startInvestigation('tx/1', 'inv-key');
    await api.startVerification('tx/1', 'run/1', 'ver-key');
    await api.submitDispute('dispute/1', 'submission-key');
    await api.submitDispute('dispute/1', 'submission-key');
    assert.equal(calls[0].url, 'https://api.test/api/transactions/tx%2F1/investigations');
    assert.equal(calls[1].url, 'https://api.test/api/transactions/tx%2F1/investigations/run%2F1/verifications');
    assert.deepEqual(JSON.parse(calls[2].body), { idempotencyKey: 'submission-key' });
    assert.equal(calls[2].body, calls[3].body);
    for (const call of calls) assert.equal(call.method, 'POST');
  });
});
test('new team creation remains account-scoped and workspace requests use the selected team', async () => {
  await intercept(async (api, calls) => {
    await api.createMerchant({ displayName: 'MOCK Team' });
    const scoped = api.forMerchant('00000000-0000-4000-8000-000000000001');
    await scoped.merchant();
    await scoped.transactions();
    await api.merchants();
    assert.equal(calls[0].url, 'https://api.test/api/merchants');
    assert.equal(calls[0].method, 'POST');
    assert.deepEqual(JSON.parse(calls[0].body), { displayName: 'MOCK Team' });
    assert.equal(calls[0].headers['X-Merchant-Id'], undefined);
    assert.equal(calls[1].headers['X-Merchant-Id'], '00000000-0000-4000-8000-000000000001');
    assert.equal(calls[2].headers['X-Merchant-Id'], calls[1].headers['X-Merchant-Id']);
    assert.equal(calls[3].headers['X-Merchant-Id'], undefined);
  });
});
test('API accepts empty successes, rejects invalid JSON, and sanitizes non-JSON errors', async () => {
  await intercept(async api => assert.equal(await api.checkPayPal(), null), () => new Response(null, { status: 204 }));
  await intercept(async api => assert.rejects(api.merchant(), error => error.code === 'INVALID_RESPONSE'), () => new Response('<html>proxy response</html>'));
  await intercept(async api => assert.rejects(api.merchant(), error => error.status === 502 && !error.message.includes('sensitive upstream text') && error.requestId === 'upstream-id'), () => new Response('sensitive upstream text', { status: 502, headers: { 'X-Request-Id': 'upstream-id' } }));
});
test('authenticated binary downloads preserve failed backend responses as errors', async () => {
  await intercept(async (api, calls) => {
    assert.equal(await (await api.downloadEvidence('tx', 'file')).text(), '%PDF-original');
    assert.equal(calls[0].headers.Authorization, 'Bearer session-token');
  }, () => new Response('%PDF-original', { headers: { 'Content-Type': 'application/pdf' } }));
  await intercept(async api => assert.rejects(api.downloadEvidence('tx', 'file'), error => error.code === 'EVIDENCE_INTEGRITY_CONFLICT' && error.status === 409), () => Response.json({ code: 'EVIDENCE_INTEGRITY_CONFLICT', message: 'Original file integrity check failed', requestId: 'r1' }, { status: 409 }));
});
test('file upload uses original bytes, deterministic identity, and the 512 KB contract', async () => {
  const file = new File(['%PDF-1.4\noriginal bytes'], 'receipt.pdf', { type: 'application/pdf' });
  const first = await evidenceUploadBody(file), second = await evidenceUploadBody(file);
  assert.equal(first.sourceKind, 'MERCHANT_INPUT');
  assert.equal(Buffer.from(first.dataBase64, 'base64').toString(), await file.text());
  assert.equal(first.externalReference, second.externalReference);
  assert.match(first.externalReference, /^file:[a-f0-9]{64}$/);
  assert.ok(!('contentHash' in first));
  await assert.rejects(evidenceUploadBody(new File(['x'], 'script.svg', { type: 'image/svg+xml' })), /PDF, PNG, or JPEG/);
  await assert.rejects(evidenceUploadBody(new File([new Uint8Array(MAX_EVIDENCE_FILE_BYTES + 1)], 'large.pdf', { type: 'application/pdf' })), /512 KB/);
  await assert.rejects(evidenceUploadBody(new File(['x'], '../receipt.pdf', { type: 'application/pdf' })), /filename/);
});
test('failed, stale, expired, or mismatched AI runs cannot unlock verification or submission', () => {
  const run = { status: 'COMPLETED', result: { verdict: 'APPROVED' }, evidenceRevision: 2, expiresAt: new Date(Date.now() + 60000).toISOString(), stale: false, expired: false };
  assert.equal(canUseRun(run, 2), true);
  for (const patch of [{ stale: true }, { expired: true }, { result: null }, { status: 'FAILED' }, { status: 'RUNNING' }, { expiresAt: new Date(Date.now() - 1).toISOString() }]) assert.equal(canUseRun({ ...run, ...patch }, 2), false);
  assert.equal(canUseRun(run, 3), false);
});
test('partial source orders preserve unknown values without crashing or inventing totals', () => {
  assert.equal(money({ currencyCode: 'USD', value: null }), '—');
  assert.equal(money({ currencyCode: null, value: '5' }), '—');
  const transaction = { order: { externalId: 'ORDER-PARTIAL', items: [{ quantity: null }, { quantity: 2 }] } };
  assert.equal(transactionSubtitle(transaction), 'ORDER-PARTIAL');
});

test('shipment reads and resolution use the selected merchant backend without provider credentials', async () => {
  await intercept(async (api, calls) => {
    const scoped = api.forMerchant('00000000-0000-4000-8000-000000000001');
    await scoped.shipmentTracking('tx/1');
    await scoped.resolveShipmentTracking('tx/1', { trackingNumber: 'MOCKGUIDE123', carrierCode: 100003 });
    assert.equal(calls[0].url, 'https://api.test/api/transactions/tx%2F1/shipment-tracking');
    assert.equal(calls[0].method, undefined);
    assert.equal(calls[1].url, 'https://api.test/api/transactions/tx%2F1/shipment-tracking/resolve');
    assert.equal(calls[1].method, 'POST');
    assert.deepEqual(JSON.parse(calls[1].body), { trackingNumber: 'MOCKGUIDE123', carrierCode: 100003 });
    for (const call of calls) {
      assert.equal(call.headers['X-Merchant-Id'], '00000000-0000-4000-8000-000000000001');
      assert.equal(call.headers['17token'], undefined);
    }
  });
});


test('Odoo credentials and management requests stay scoped to the selected team', async () => {
  await intercept(async (api, calls) => {
    const scoped = api.forMerchant('team-odoo');
    await scoped.connectErp('odoo', 'MOCK-key', 'https://demo.odoo.com', 'demo');
    await scoped.erpStatus('connection-1'); await scoped.syncErp('connection-1'); await scoped.disconnectErp('connection-1');
    assert.deepEqual(JSON.parse(calls[0].body), { provider: 'odoo', apiKey: 'MOCK-key', baseUrl: 'https://demo.odoo.com', database: 'demo' });
    assert.equal(calls[1].url, 'https://api.test/api/integrations/connection-1/status');
    for (const call of calls) assert.equal(call.headers['X-Merchant-Id'], 'team-odoo');
  });
});
