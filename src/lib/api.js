// Call with the Supabase user's access token. Never put PayPal secrets here.
export function createApi({ baseUrl, getAccessToken }) {
  async function request(path, options = {}) {
    const token = await getAccessToken();
    if (!token) throw Object.assign(new Error('Sign in to continue.'), { status: 401 });
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    });
    const body = await response.json();
    if (!response.ok) throw Object.assign(new Error(body.message || 'Request failed.'), { status: response.status, code: body.code, requestId: body.requestId });
    return body;
  }
  return {
    merchant: () => request('/merchants/me'),
    integrations: () => request('/settings/integrations'),
    transactions: ({ page = 1, pageSize = 20, paypalCaptureId } = {}) => request(`/transactions?${new URLSearchParams({ page, pageSize, ...(paypalCaptureId ? { paypalCaptureId } : {}) })}`),
    transaction: id => request(`/transactions/${encodeURIComponent(id)}`),
    evidence: id => request(`/transactions/${encodeURIComponent(id)}/evidence`),
    updateMerchant: body => request('/merchants/me/settings', { method: 'PATCH', body: JSON.stringify(body) }),
    checkPayPal: () => request('/settings/integrations/paypal/check', { method: 'POST' }),
    refreshEvidence: id => request(`/transactions/${encodeURIComponent(id)}/refresh-evidence`, { method: 'POST' }),
    registerOrder: body => request('/orders', { method: 'POST', body: JSON.stringify(body) }),
    registerEvidence: (id, body) => request(`/transactions/${encodeURIComponent(id)}/evidence`, { method: 'POST', body: JSON.stringify(body) }),
  };
}
