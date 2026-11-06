import ProfileAvatar from './ProfileAvatar';
import React, { useEffect, useRef, useState } from 'react';

const sections = ['Profile', 'Preferences', 'Notifications', 'Billing', 'Usage', 'Purchases', 'Security'];

export default function Settings({ notify, orders, onPurchase, isOpen }) {
  const [active, setActive] = useState('Profile');
  const categoryRefs = useRef([]);
  const navigateCategories = (event, index) => {
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % sections.length;
    else if (event.key === 'ArrowUp') next = (index - 1 + sections.length) % sections.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = sections.length - 1;
    else return;
    event.preventDefault();
    setActive(sections[next]);
    categoryRefs.current[next]?.focus();
  };
  useEffect(() => {
    if (!isOpen) return;
    const onArrow = event => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        navigateCategories(event, sections.indexOf(active));
      }
    };
    window.addEventListener('keydown', onArrow);
    return () => window.removeEventListener('keydown', onArrow);
  }, [isOpen, active]);
  const [profile, setProfile] = useState({ name: 'Alex Morgan', email: 'alex@example.com' });
  const [preferences, setPreferences] = useState({ language: 'English', timezone: 'America/Los_Angeles', currency: 'USD' });
  const [notifications, setNotifications] = useState({ messages: true, agreements: true, purchases: true, news: false });
  const [twoFactor, setTwoFactor] = useState(false);
  const [purchasePreferences, setPurchasePreferences] = useState({ import: true, receipts: true });
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const save = event => { event.preventDefault(); notify('Saved.'); };
  const toggle = (label, checked, change, detail) => <label className="settings-toggle"><span><strong>{label}</strong>{detail && <small>{detail}</small>}</span><input type="checkbox" checked={checked} onChange={event => change(event.target.checked)} /></label>;
  return <div className="settings-layout">
    <nav className="settings-nav" role="tablist" aria-label="Settings sections" aria-orientation="vertical">{sections.map((section, index) => <button key={section} ref={element => { categoryRefs.current[index] = element; }} id={`settings-tab-${section.toLowerCase()}`} role="tab" aria-selected={active === section} aria-controls="settings-category-panel" tabIndex={active === section ? 0 : -1} className={`nav-item ${active === section ? 'selected active' : ''}`} onKeyDown={event => navigateCategories(event, index)} onClick={() => setActive(section)}>{section}<span aria-hidden="true">›</span></button>)}</nav>
    <section id="settings-category-panel" className="card settings-content" role="tabpanel" aria-labelledby={`settings-tab-${active.toLowerCase()}`} tabIndex={0}><div className="settings-content-inner">

      {active === 'Profile' && <form onSubmit={save}><div className="settings-identity"><ProfileAvatar /><div><strong>{profile.name}</strong><small>Your profile avatar</small></div></div><label>Display name<input required value={profile.name} onChange={event => setProfile({ ...profile, name: event.target.value })} /></label><label>Email address<input required type="email" value={profile.email} onChange={event => setProfile({ ...profile, email: event.target.value })} /></label><button className="button primary">Save profile</button></form>}
      {active === 'Preferences' && <form onSubmit={save}><label>Language<select value={preferences.language} onChange={event => setPreferences({ ...preferences, language: event.target.value })}><option>English</option><option>Español</option></select></label><label>Time zone<select value={preferences.timezone} onChange={event => setPreferences({ ...preferences, timezone: event.target.value })}><option>America/Los_Angeles</option><option>America/New_York</option><option>Europe/London</option><option>UTC</option></select></label><label>Currency<select value={preferences.currency} onChange={event => setPreferences({ ...preferences, currency: event.target.value })}><option>USD</option><option>EUR</option><option>GBP</option></select></label><button className="button primary">Save preferences</button></form>}
      {active === 'Notifications' && <form onSubmit={save}>{[['messages', 'Case messages', 'New messages from the other party or mediator.'], ['agreements', 'Agreements and next steps', 'Proposals, acceptance, and follow-up actions.'], ['purchases', 'Purchase updates', 'Order status and delivery updates.'], ['news', 'Product news', 'Occasional updates about the platform.']].map(([key, label, detail]) => <React.Fragment key={key}>{toggle(label, notifications[key], value => setNotifications({ ...notifications, [key]: value }), detail)}</React.Fragment>)}<div className="settings-save"><button className="button primary">Save notifications</button></div></form>}
      {active === 'Billing' && <><div className="settings-info-row"><div><strong>Current plan</strong><small>No active subscription</small></div><span className="badge">Free</span></div><div className="settings-info-row"><div><strong>Payment method</strong><small>No payment method connected</small></div><button className="button secondary">Add method</button></div><h3>Invoices</h3><div className="settings-empty">No invoices yet.</div></>}
      {active === 'Usage' && <><div className="settings-usage-grid">{[['Purchases', String(orders.length)], ['Active mediations', String(orders.filter(order => order.status === 'In mediation').length)], ['Resolved purchases', String(orders.filter(order => order.status === 'Resolved').length)]].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div><div className="settings-info-row"><div><strong>AI usage</strong></div><span className="badge">0 requests</span></div><div className="settings-info-row"><div><strong>Storage</strong></div><span className="badge">0 MB</span></div></>}
      {active === 'Purchases' && <><form onSubmit={save}>{toggle('Automatically import purchases', purchasePreferences.import, value => setPurchasePreferences({ ...purchasePreferences, import: value }), 'Apply when a purchase source is connected.')}{toggle('Include receipts', purchasePreferences.receipts, value => setPurchasePreferences({ ...purchasePreferences, receipts: value }), 'Keep available receipts with purchase details.')}<div className="settings-save"><button className="button primary">Save purchase preferences</button></div></form><h3>Connected sources</h3><div className="settings-info-row"><div><strong>PayPal</strong><small>No account connected</small></div><button className="button secondary">Connect</button></div><h3>Recent purchases</h3>{orders.slice(0, 3).map(order => <button className="settings-purchase" key={order.id} onClick={() => onPurchase(order)}><span><strong>{order.name}</strong><small>Order #{order.id} · {order.status}</small></span><span aria-hidden="true">↗</span></button>)}</>}
      {active === 'Security' && <><form onSubmit={event => { event.preventDefault(); if (password.next !== password.confirm) { notify('The new passwords do not match.'); return; } setPassword({ current: '', next: '', confirm: '' }); }}><h3>Change password</h3><label>Current password<input type="password" autoComplete="current-password" required value={password.current} onChange={event => setPassword({ ...password, current: event.target.value })} /></label><label>New password<input type="password" autoComplete="new-password" required minLength={8} value={password.next} onChange={event => setPassword({ ...password, next: event.target.value })} /><small>Use at least 8 characters.</small></label><label>Confirm new password<input type="password" autoComplete="new-password" required minLength={8} value={password.confirm} onChange={event => setPassword({ ...password, confirm: event.target.value })} /></label><button className="button secondary">Update password</button></form><h3>Two-factor authentication</h3>{toggle('Two-factor authentication', twoFactor, setTwoFactor)}<h3>Sessions</h3><div className="settings-info-row"><div><strong>This browser</strong><small>Current session</small></div><span className="badge">Current</span></div></>}
    </div></section>
  </div>;
}
