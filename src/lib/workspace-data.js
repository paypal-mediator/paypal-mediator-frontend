export const transactionListKey = (page = 1, search = '') => JSON.stringify(['transactions', page, search]);
export const disputeListKey = (page = 1) => JSON.stringify(['disputes', page]);
export const activityKey = (cursor = null, filter = 'All activity', transactionId) => JSON.stringify(['activity', cursor, ['Investigation', 'Verification'].includes(filter) ? filter : 'All activity', transactionId || null]);
export const transactionKey = id => `transaction:${id}`;
export const evidenceKey = id => `evidence:${id}`;
export const disputeKey = id => `dispute:${id}`;

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
  const [transaction, dossier, investigations] = await Promise.all([api.transaction(transactionId, signal), api.evidence(transactionId, signal), api.investigations(transactionId, signal)]);
  const investigation = investigations.items[0] || null;
  const verifications = investigation ? await api.verifications(transactionId, investigation.id, signal) : { items: [] };
  return { dispute, transaction, dossier, investigation, verification: verifications.items[0] || null };
}

export async function preloadWorkspace(api, route) {
  const store = api.resources;
  const transactions = store.load(transactionListKey(), signal => api.transactions({ page: 1, pageSize: 20 }, signal));
  const disputes = store.load(disputeListKey(), signal => api.disputes({ page: 1, pageSize: 20 }, signal));
  // Share the PayPal read with Overview and the integrations settings panel.
  const paypal = api.integrations();
  const tasks = [
    store.load('merchant', signal => api.merchant(signal)),
    transactions, disputes,
    store.load(activityKey(), signal => api.activity({ limit: 30 }, signal)),
    store.load('overview', () => Promise.all([transactions, disputes, paypal])),
    store.load('settings:integrations', async signal => loadIntegrations(api, signal, await paypal)),
    store.load('settings:billing', signal => loadBilling(api, signal)),
  ];
  if (route.page === 'details') tasks.push(store.load(transactionKey(route.id), signal => api.transaction(route.id, signal)));
  if (route.page === 'evidence') tasks.push(store.load(evidenceKey(route.id), signal => Promise.all([api.transaction(route.id, signal), api.evidence(route.id, signal)])));
  if (route.page === 'dispute-details') tasks.push(store.load(disputeKey(route.id), signal => loadDispute(api, route.id, signal)));
  // A failed section keeps its own retry/error state; other tables remain usable.
  await Promise.allSettled(tasks);
  return true;
}
