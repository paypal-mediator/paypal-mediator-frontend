import React, { useEffect, useRef, useState } from 'react';
import { useRemote } from './lib/useRemote';
import { loadIntegrations } from './lib/workspace-data';
import RemoteState from './RemoteState';
import Badge from './Badge';
import Icon from './Icon';
import { date, label } from './lib/format';

import { PayPalConnection } from './PayPalConnection';
function IntegrationDetails({ provider, paypal, admin, api, onChanged, onClose }) {
  const dialog = useRef(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const isPayPal = provider.provider === 'paypal';
  useEffect(() => { const trigger = document.activeElement; dialog.current.showModal(); return () => { if (trigger?.isConnected) trigger.focus(); }; }, []);
  const perform = async task => {
    setBusy(true); setError('');
    try { await task(); await onChanged(); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  return <dialog ref={dialog} className="integration-details-dialog" aria-labelledby="integration-details-title" onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}><button className="settings-close" aria-label="Close integration" onClick={onClose}><Icon name="X" /></button><div className="settings-section-heading"><h2 id="integration-details-title">{provider.name}</h2></div>{error && <p role="alert">{error}</p>}
    {isPayPal ? <>{admin && <PayPalConnection getApi={async () => api} connected={paypal.connectionStatus === 'CONNECTED'} onConnected={onChanged} />}{admin && paypal.sellerId && <button type="button" className="button secondary" disabled={busy} onClick={() => perform(() => api.disconnectPayPal())}>Disconnect this business</button>}<dl><div><dt>Connection</dt><dd><Badge>{label(paypal.connectionStatus)}</Badge></dd></div><div><dt>Dispute read access</dt><dd>{label(paypal.disputesReadStatus)}</dd></div><div><dt>Credentials configured</dt><dd>{paypal.credentialsConfigured ? 'Yes' : 'No'}</dd></div><div><dt>Webhook configured</dt><dd>{paypal.webhookConfigured ? 'Yes' : 'No'}</dd></div><div><dt>Last checked</dt><dd>{date(paypal.lastCheckedAt)}</dd></div></dl>{admin && <button className="button primary" disabled={busy} onClick={() => perform(() => api.checkPayPal())}>{busy ? 'Checking…' : 'Check connection'}</button>}</>
      : null}
  </dialog>;
}

function OdooConnection({ api, onChanged, onClose }) {
  const dialog = useRef(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { dialog.current.showModal(); }, []);
  const submit = async event => {
    event.preventDefault();
    const form = event.currentTarget, values = new FormData(form);
    setBusy(true); setError('');
    try {
      await api.connectErp('odoo', values.get('apiKey'), values.get('baseUrl'), values.get('database'));
      form.reset(); await onChanged(); onClose();
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  return <dialog ref={dialog} className="integration-details-dialog" aria-label="Connect Odoo" onCancel={event => { event.preventDefault(); event.stopPropagation(); if (!busy) onClose(); }}>
    <button className="settings-close" aria-label="Close connection" disabled={busy} onClick={onClose}><Icon name="X" /></button>
    <h2>Connect Odoo</h2><p>Connect an Odoo Online instance to this team. External API access must be enabled for your Odoo plan or trial.</p>
    <form onSubmit={submit} className="account-settings-form">
      <label>Instance URL<input name="baseUrl" type="url" placeholder="https://your-company.odoo.com" required disabled={busy} /></label>
      <label>Database name<input name="database" placeholder="your-company" maxLength={255} required disabled={busy} /></label>
      <label>API Key<input name="apiKey" type="password" autoComplete="off" required disabled={busy} /></label>
      <p className="muted">Create a key in Odoo: My preferences / Security / Create API Key. Your key is encrypted and never displayed again here.</p>
      {error && <p role="alert">{error}</p>}
      <button className="button primary" disabled={busy}>{busy ? 'Verifying connection...' : 'Verify and connect'}</button>
    </form>
  </dialog>;
}

export default function MerchantIntegrations({ api, admin }) {
  const resource = useRemote(signal => loadIntegrations(api, signal), [api], { store: api.resources, key: 'settings:integrations' });
  const [selected, setSelected] = useState(null), [busy, setBusy] = useState(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const perform = async (connection, action) => {
    if (action === 'disconnect' && !window.confirm('Disconnect this ERP? Imported records from this connection will be removed. Revoke its API Key in Odoo separately.')) return;
    setBusy(connection.id); setError(''); setNotice('');
    try {
      if (action === 'disconnect') await api.disconnectErp(connection.id);
      else if (action === 'sync') { await api.syncErp(connection.id); setNotice('Synchronization queued. Results will appear after processing.'); }
      else { await api.erpStatus(connection.id); setNotice('Connection verified with Odoo.'); }
      await resource.reload();
    } catch (failure) { setError(failure.message); } finally { setBusy(null); }
  };
  return <><div className="settings-section-heading"><h2>Connections</h2><p>Manage payment and business connections for the selected team.</p></div><RemoteState resource={resource}>{data => <>
    {(data.erpError || error) && <p role="alert">{error || data.erpError}</p>}{notice && <p role="status">{notice}</p>}
    <h3>Team connections</h3>
    <button type="button" className="button secondary" onClick={() => setSelected('paypal')}>PayPal: {label(data.paypal.connectionStatus)}</button>
    {data.connections.map(connection => <article className="card" key={connection.id}>
      <h4>{connection.provider === 'odoo' ? 'Odoo' : label(connection.provider)}</h4>
      <p>{connection.baseUrl || connection.externalTenantId || 'ERP connection'}</p>
      <dl><div><dt>Status</dt><dd><Badge>{label(connection.status)}</Badge></dd></div><div><dt>Last sync</dt><dd>{date(connection.lastSyncAt)}</dd></div></dl>
      {connection.lastSyncError && <p role="alert">{connection.lastSyncError}</p>}
      {admin && <div className="settings-row-actions">{connection.provider === 'odoo' && <><button className="button secondary" disabled={Boolean(busy)} onClick={() => perform(connection, 'check')}>Test connection</button><button className="button secondary" disabled={Boolean(busy)} onClick={() => perform(connection, 'sync')}>Sync now</button></>}<button className="button secondary" disabled={Boolean(busy)} onClick={() => perform(connection, 'disconnect')}>Disconnect</button></div>}
    </article>)}
    {!data.connections.length && <p className="muted">No ERP connections for this team yet.</p>}
    {admin && <><h3>Add connection</h3><button className="button primary" onClick={() => setSelected('odoo')}>Connect Odoo</button><p className="muted">You can connect more than one Odoo instance to this team.</p></>}
    <p className="muted">Disconnecting removes this application access access locally. Revoke the API Key in Odoo if you no longer use it.</p>
    {selected === 'odoo' && <OdooConnection api={api} onChanged={resource.reload} onClose={() => setSelected(null)} />}
    {selected === 'paypal' && <IntegrationDetails provider={{provider: 'paypal', name: 'PayPal'}} paypal={data.paypal} admin={admin} api={api} onChanged={resource.reload} onClose={() => setSelected(null)} />}
  </>}</RemoteState></>;
}
