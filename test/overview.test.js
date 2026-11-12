import test from 'node:test';
import assert from 'node:assert/strict';
import { overviewMetrics, sumAmounts } from '../src/lib/overview.js';

test('overview aggregates currency totals exactly without mixing currencies or floating point', () => {
  assert.deepEqual(sumAmounts([{ currencyCode: 'USD', value: '0.1' }, { currencyCode: 'USD', value: '0.2' }, { currencyCode: 'EUR', value: '12.99' }]), [{ currencyCode: 'EUR', value: '12.99' }, { currencyCode: 'USD', value: '0.3' }]);
});

test('overview separates historical volume, open exposure, deadlines and document coverage', () => {
  const now = Date.parse('2026-11-12T12:00:00Z');
  const payment = (id, at, status) => ({ id, capturedAt: at, amount: { currencyCode: 'USD', value: '10' }, readiness: { status } });
  const payments = [payment('a', '2026-11-12T00:00:00Z', 'READY'), payment('b', '2026-09-01T00:00:00Z', 'INCOMPLETE'), payment('c', '2026-11-13T00:00:00Z', 'NEEDS_REVIEW')];
  const dispute = (id, status, deadlineAt) => ({ id, paypalStatus: status, internalState: 'LINKED', deadlineAt, amount: { currencyCode: 'USD', value: '5' } });
  const result = overviewMetrics(payments, [dispute('open', 'OPEN', '2026-11-11T00:00:00Z'), dispute('resolved', 'RESOLVED', '2026-11-10T00:00:00Z'), dispute('review', 'UNDER_REVIEW', '2026-11-14T00:00:00Z')], now);
  assert.equal(result.recentCount, 1);
  assert.deepEqual(result.volume, [{ currencyCode: 'USD', value: '10' }]);
  assert.deepEqual(result.exposure, [{ currencyCode: 'USD', value: '10' }]);
  assert.equal(result.needsResponse.length, 1);
  assert.equal(result.overdue, 1);
  assert.equal(result.readyPercent, 33);
  assert.deepEqual(result.deadlines.map(item => item.id), ['open', 'review']);
  assert.equal(result.trend.reduce((total, item) => total + item.count, 0), 1);
});
