import React, { useEffect, useRef, useState } from 'react';
import { useRemote } from './lib/useRemote';
import { loadIntegrations } from './lib/workspace-data';
import RemoteState from './RemoteState';
import Badge from './Badge';
import Icon from './Icon';
import { date, label } from './lib/format';

const connectedStates = ['connected', 'syncing', 'restricted_permissions', 'rate_limited'];
function IntegrationDetails({ provider, connection, paypal, admin, api, onChanged, onClose }) {
  const dialog = useRef(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const isPayPal = provider.provider === 'paypal';
  useEffect(() => { const trigger = document.activeElement; dialog.current.showModal(); return () => { if (trigger?.isConnected) trigger.focus(); }; }, []);
  const perform = async task => {
    setBusy(true); setError('');
    try { await task(); await onChanged(); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  return <dialog ref={dialog} className="integration-details-dialog" aria-labelledby="integration-details-title" onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}><button className="settings-close" aria-label="Close integration" onClick={onClose}><Icon name="X" /></button><div className="settings-section-heading"><h2 id="integration-details-title">{provider.name}</h2></div>{error && <p role="alert">{error}</p>}
    {isPayPal ? <><dl><div><dt>Connection</dt><dd><Badge>{label(paypal.connectionStatus)}</Badge></dd></div><div><dt>Dispute read access</dt><dd>{label(paypal.disputesReadStatus)}</dd></div><div><dt>Credentials configured</dt><dd>{paypal.credentialsConfigured ? 'Yes' : 'No'}</dd></div><div><dt>Webhook configured</dt><dd>{paypal.webhookConfigured ? 'Yes' : 'No'}</dd></div><div><dt>Last checked</dt><dd>{date(paypal.lastCheckedAt)}</dd></div></dl>{admin && <button className="button primary" disabled={busy} onClick={() => perform(() => api.checkPayPal())}>{busy ? 'Checking…' : 'Check connection'}</button>}</>
      : <>{connection && <><dl><div><dt>Status</dt><dd><Badge>{label(connection.status)}</Badge></dd></div><div><dt>Last sync</dt><dd>{date(connection.lastSyncAt)}</dd></div></dl>{connection.lastSyncError && <p role="alert">{connection.lastSyncError}</p>}</>}{!connection || !connectedStates.includes(connection.status) ? <p className="muted">Connection setup for this provider is not available yet.</p> : admin && <button className="button secondary" disabled={busy} onClick={() => perform(() => api.disconnectErp(connection.id))}>{busy ? 'Disconnecting…' : 'Disconnect'}</button>}</>}
  </dialog>;
}

export default function MerchantIntegrations({ api, admin }) {
  const resource = useRemote(signal => loadIntegrations(api, signal), [api], { store: api.resources, key: 'settings:integrations' });
  const [selected, setSelected] = useState(null);
  return <><div className="settings-section-heading"><h2>Integrations</h2><p>Connect your payment and business systems.</p></div><RemoteState resource={resource}>{data => {
    const providers = new Map(data.catalog.map(provider => [provider.provider, provider]));
    for (const connection of data.connections) if (!providers.has(connection.provider)) providers.set(connection.provider, { provider: connection.provider, name: label(connection.provider.replaceAll('-', ' ')) });
    const connections = [...data.connections].sort((a, b) => Number(connectedStates.includes(b.status)) - Number(connectedStates.includes(a.status)) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    const entries = [{ provider: 'paypal', name: 'PayPal' }, ...providers.values()];
    return <>{data.erpError && <p role="alert">{data.erpError}</p>}<div className="integration-button-grid">{entries.map(provider => {
      const connection = connections.find(item => item.provider === provider.provider);
      const connected = provider.provider === 'paypal' ? data.paypal.connectionStatus === 'CONNECTED' : connectedStates.includes(connection?.status);
      return <button type="button" className={`integration-button ${connected ? 'is-connected' : ''}`} key={provider.provider} aria-label={`${provider.name}: ${connected ? 'Connected' : 'Connect'}`} onClick={() => setSelected(provider.provider)}><span className="integration-button-mark" aria-hidden="true">{provider.provider === 'paypal' ? 'P' : provider.name.split(/\s+/).map(word => word[0]).slice(0, 2).join('')}</span><strong>{provider.name}</strong><span className="integration-button-overlay">{connected && <Icon name="Check" size={13} />}{connected ? 'Connected' : 'Connect'}</span></button>;
    })}</div>{selected && <IntegrationDetails key={selected} provider={entries.find(provider => provider.provider === selected)} connection={connections.find(item => item.provider === selected)} paypal={data.paypal} admin={admin} api={api} onChanged={resource.reload} onClose={() => setSelected(null)} />}</>;
  }}</RemoteState></>;
}
