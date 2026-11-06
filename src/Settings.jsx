import Badge from './Badge';
import React, { useEffect, useRef, useState } from 'react';
import ProfileAvatar from './ProfileAvatar';
import { label, date } from './lib/format';
const sections = ['Merchant', 'Policies', 'Integrations'];
export default function Settings({ merchant, integration, isOpen }) {
  const [active, setActive] = useState('Merchant');
  const refs = useRef([]);
  const navigate = (event, index) => {
    if (event.defaultPrevented) return;
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % sections.length;
    else if (event.key === 'ArrowUp') next = (index + sections.length - 1) % sections.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = sections.length - 1;
    else return;
    event.preventDefault();
    setActive(sections[next]);
    refs.current[next]?.focus();
  };
  useEffect(() => {
    if (!isOpen) return;
    const handler = event => {
      if (event.target.closest?.('input, textarea, select, button[role="switch"]')) return;
      navigate(event, sections.indexOf(active));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, active]);
  return <div className="settings-layout"><nav className="settings-nav" role="tablist" aria-label="Settings categories" aria-orientation="vertical">{sections.map((section, index) => <button type="button" role="tab" id={`setting-${index}`} aria-controls="settings-panel" aria-selected={section === active} tabIndex={section === active ? 0 : -1} key={section} ref={element => { refs.current[index] = element; }} className={`nav-item ${active === section ? 'active' : ''}`} onClick={() => setActive(section)} onKeyDown={event => navigate(event, index)}>{section}</button>)}</nav><section className="card settings-content" role="tabpanel" id="settings-panel" aria-labelledby={`setting-${sections.indexOf(active)}`}><div className="settings-content-inner">
    {active === 'Merchant' && <><div className="settings-identity"><ProfileAvatar /><div><strong>{merchant.displayName}</strong><small>{merchant.role}</small></div></div><dl className="merchant-details"><div><dt>Merchant ID</dt><dd>{merchant.id}</dd></div></dl></>}
    {active === 'Policies' && <>{[['Investigations allowed', merchant.policy.allowInvestigations], ['Submissions allowed', merchant.policy.allowSubmissions], ['Merchant approval required', merchant.policy.requireMerchantApproval]].map(([name, enabled]) => <div className="settings-info-row" key={name}><strong>{name}</strong><Badge>{enabled ? 'Yes' : 'No'}</Badge></div>)}<p>Policy changes require administrator access. Merchant approval is mandatory.</p></>}
    {active === 'Integrations' && <><div className="card-heading"><h2>PayPal</h2></div><dl><div><dt>Connection</dt><dd>{label(integration.connectionStatus)}</dd></div><div><dt>Dispute read access</dt><dd>{label(integration.disputesReadStatus)}</dd></div><div><dt>Credentials configured</dt><dd>{integration.credentialsConfigured ? 'Yes' : 'No'}</dd></div><div><dt>Webhook configured</dt><dd>{integration.webhookConfigured ? 'Yes' : 'No'}</dd></div><div><dt>Last checked</dt><dd>{date(integration.lastCheckedAt)}</dd></div></dl></>}
  </div></section></div>;
}
