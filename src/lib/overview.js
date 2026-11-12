const day = 86400000;
export function sumAmounts(amounts) {
  const totals = new Map();
  for (const amount of amounts) {
    if (!amount?.currencyCode || !/^\d+(\.\d{1,8})?$/.test(amount.value)) continue;
    const [whole, fraction = ''] = amount.value.split('.');
    const units = BigInt(whole) * 100000000n + BigInt(fraction.padEnd(8, '0'));
    totals.set(amount.currencyCode, (totals.get(amount.currencyCode) || 0n) + units);
  }
  return [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([currencyCode, units]) => ({ currencyCode, value: `${units / 100000000n}.${String(units % 100000000n).padStart(8, '0')}`.replace(/0+$/, '').replace(/\.$/, '') }));
}
export function overviewMetrics(transactions, disputes, now = Date.now()) {
  const recent = transactions.filter(item => { const at = Date.parse(item.capturedAt); return at >= now - 30 * day && at <= now; });
  const active = disputes.filter(item => item.paypalStatus !== 'RESOLVED' && !['CLOSED', 'RESOLVED_WON', 'RESOLVED_LOST'].includes(item.internalState));
  const needsResponse = active.filter(item => ['OPEN', 'WAITING_FOR_SELLER_RESPONSE'].includes(item.paypalStatus));
  const deadlines = active.filter(item => item.deadlineAt).sort((a, b) => Date.parse(a.deadlineAt) - Date.parse(b.deadlineAt));
  const readiness = ['READY', 'INCOMPLETE', 'NEEDS_REVIEW'].map(status => ({ status, count: transactions.filter(item => item.readiness.status === status).length }));
  const start = new Date(now); start.setUTCHours(0, 0, 0, 0);
  const trend = Array.from({ length: 14 }, (_, index) => {
    const from = start.getTime() - (13 - index) * day;
    return { date: new Date(from).toISOString(), count: transactions.filter(item => { const at = Date.parse(item.capturedAt); return at >= from && at < from + day && at <= now; }).length };
  });
  return { volume: sumAmounts(recent.map(item => item.amount)), recentCount: recent.length, active, exposure: sumAmounts(active.map(item => item.amount)), needsResponse, deadlines, overdue: deadlines.filter(item => Date.parse(item.deadlineAt) < now).length, readiness, readyPercent: transactions.length ? Math.round(readiness[0].count / transactions.length * 100) : 0, trend };
}
