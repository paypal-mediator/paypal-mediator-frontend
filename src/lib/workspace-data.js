export const transactionListKey = (page = 1, search = '') => JSON.stringify(['transactions', page, search]);
export const disputeListKey = (page = 1) => JSON.stringify(['disputes', page]);
export const activityKey = (cursor = null, filter = 'All activity', transactionId) => JSON.stringify(['activity', cursor, ['Investigation', 'Verification'].includes(filter) ? filter : 'All activity', transactionId || null]);
export const transactionKey = id => `transaction:${id}`;
export const evidenceKey = id => `evidence:${id}`;
export const disputeKey = id => `dispute:${id}`;

// Collect every server page so removing pagination never hides older records.
export async function loadAllPages(loader, signal) {
  const first = await loader({ page: 1, pageSize: 100 }, signal);
  const pages = Math.ceil(first.total / first.pageSize);
  const rest = [];
  for (let page = 2; page <= pages; page += 3) {
    rest.push(...await Promise.all(Array.from({ length: Math.min(3, pages - page + 1) }, (_, index) => loader({ page: page + index, pageSize: first.pageSize }, signal))));
  }
  return { ...first, items: [first, ...rest].flatMap(result => result.items) };
}
export async function loadTransactions(api, signal) {
  const data = await loadAllPages((params, signal) => api.transactions(params, signal), signal);
  await Promise.all(data.items.map(item => api.resources.load(transactionKey(item.id), () => Promise.resolve(item), { force: true })));
  return data;
}
export async function loadActivity(api, signal) {
  let result = await api.activity({ limit: 100 }, signal);
  const items = [...result.items];
  const cursors = new Set();
  while (result.nextCursor && !cursors.has(JSON.stringify(result.nextCursor))) {
    cursors.add(JSON.stringify(result.nextCursor));
    result = await api.activity({ limit: 100, ...result.nextCursor }, signal);
    items.push(...result.items);
  }
  return { ...result, items, nextCursor: null };
}
export function loadEvidence(api, id) {
  return api.resources.load(evidenceKey(id), signal => Promise.all([
    api.resources.load(transactionKey(id), signal => api.transaction(id, signal)), api.evidence(id, signal),
  ]));
}
export function prefetchDetails(api, page, id) {
  const task = page === 'dispute-details'
    ? api.resources.load(disputeKey(id), signal => loadDispute(api, id, signal))
    : page === 'evidence' ? loadEvidence(api, id)
      : api.resources.load(transactionKey(id), signal => api.transaction(id, signal));
  task.catch(() => {});
  return task;
}
export async function warmWorkspace(api) {
  const transactions = api.resources.snapshot(transactionListKey()).data?.items || [];
  const disputes = api.resources.snapshot(disputeListKey()).data?.items || [];
  const queue = [...transactions.slice(0, 3).map(item => ['evidence', item.id]), ...disputes.slice(0, 3).map(item => ['dispute-details', item.id])];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(2, queue.length) }, async () => {
    while (next < queue.length) { const [page, id] = queue[next++]; await prefetchDetails(api, page, id).catch(() => {}); }
  }));
}
export function workspacePrepared(api, route) {
  const keys = ['merchant', transactionListKey(), disputeListKey(), activityKey(), 'overview', 'settings:integrations', 'settings:billing'];
  if (route.page === 'details') keys.push(transactionKey(route.id));
  if (route.page === 'evidence') keys.push(evidenceKey(route.id));
  if (route.page === 'dispute-details') keys.push(disputeKey(route.id));
  return keys.every(key => !api.resources.snapshot(key).loading);
}

export async function loadIntegrations(api, signal, paypal) {
  const integration = paypal || await api.integrations(signal);
  const [catalog, connections] = await Promise.allSettled([api.erpCatalog(signal), api.erpConnections(signal)]);
  return { paypal: integration.paypal, catalog: catalog.status === 'fulfilled' ? catalog.value.items : [], connections: connections.status === 'fulfilled' ? connections.value.items : [], erpError: catalog.status === 'rejected' ? catalog.reason.message : connections.status === 'rejected' ? connections.reason.message : null };
}
export async function loadBilling(api, signal) {
  const [plans, subscription] = await Promise.all([api.plans(signal), api.subscription(signal).catch(error => { if (error.status === 404) return null; throw error; })]);
  return { plans, subscription };
}
export async function loadDispute(api, id, signal) {
  const dispute = await api.dispute(id, signal);
  if (!dispute.link.transactionId) return { dispute, transaction: null, dossier: null, investigation: null, verification: null };
  const transactionId = dispute.link.transactionId;
  const [[transaction, dossier], investigations] = await Promise.all([loadEvidence(api, transactionId), api.investigations(transactionId, signal)]);
  const investigation = investigations.items[0] || null;
  const verifications = investigation ? await api.verifications(transactionId, investigation.id, signal) : { items: [] };
  return { dispute, transaction, dossier, investigation, verification: verifications.items[0] || null };
}

export async function preloadWorkspace(api, route) {
  const store = api.resources;
  const transactions = store.load(transactionListKey(), signal => loadTransactions(api, signal));
  const disputes = store.load(disputeListKey(), signal => loadAllPages((params, signal) => api.disputes(params, signal), signal));
  // Share the PayPal read with Overview and the integrations settings panel.
  const paypal = api.integrations();
  const tasks = [
    store.load('merchant', signal => api.merchant(signal)),
    transactions, disputes,
    store.load(activityKey(), signal => loadActivity(api, signal)),
    store.load('overview', () => Promise.all([transactions, disputes, paypal])),
    store.load('settings:integrations', async signal => loadIntegrations(api, signal, await paypal)),
    store.load('settings:billing', signal => loadBilling(api, signal)),
  ];
  if (route.page === 'details') tasks.push(store.load(transactionKey(route.id), signal => api.transaction(route.id, signal)));
  if (route.page === 'evidence') tasks.push(loadEvidence(api, route.id));
  if (route.page === 'dispute-details') tasks.push(store.load(disputeKey(route.id), signal => loadDispute(api, route.id, signal)));
  // A failed section keeps its own retry/error state; other tables remain usable.
  await Promise.allSettled(tasks);
  return true;
}
