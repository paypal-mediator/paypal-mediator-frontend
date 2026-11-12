import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceSnapshots } from '../src/lib/evidence-snapshots.js';

test('evidence history keeps each original version and excludes later records from older revisions', () => {
  const transaction = { createdAt: '2026-11-01T00:00:00Z', readiness: { checks: [{ code: 'TRACKING', status: 'CONFLICT' }, { code: 'PROOF_OF_DELIVERY', status: 'MISSING' }] } };
  const item = (id, version, integrity = 'VALID') => ({ id, version, type: 'TRACKING', sourceSystem: 'Order register', externalReference: 'parcel', integrity, retrievedAt: `2026-11-0${version}T00:00:00Z` });
  const snapshots = evidenceSnapshots(transaction, { revision: 2, items: [item('new', 2, 'INVALID'), item('old', 1)] });
  assert.deepEqual(snapshots.map(snapshot => snapshot.revision), [2, 1]);
  assert.deepEqual(snapshots[0].items.map(item => item.id), ['new']);
  assert.deepEqual(snapshots[1].items.map(item => item.id), ['old']);
  assert.equal(snapshots[0].checks[0].status, 'CONFLICT');
  assert.equal(snapshots[1].checks[0].status, 'PRESENT');
  assert.equal(snapshots[1].checks[1].status, 'MISSING');
});
