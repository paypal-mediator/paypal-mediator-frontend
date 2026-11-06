import EvidenceUpload from './EvidenceUpload';
import RestoredDisputes from './RestoredDisputes';
import DisputeWorkspace from './DisputeWorkspace';
import EvidenceHistory from './EvidenceHistory';
import Badge from './Badge';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ProfileAvatar from './ProfileAvatar';
import ProductThumbnail from './ProductThumbnail';
import PurchaseSummary from './PurchaseSummary';
import TransactionFilters from './TransactionFilters';
import Settings from './Settings';
import { transactions, dossiers, merchant, integration } from './data/fixtures';
import { date, label, money, transactionName, transactionSubtitle } from './lib/format';
import './styles.css';
const nav = [['overview', '◫', 'Overview'], ['transactions', '▦', 'Transactions'], ['disputes', '◎', 'Disputes'], ['activity', '◷', 'Agent Activity']];
const Card = ({ children, className = '' }) => <section className={`card ${className}`}>{children}</section>;
const rootPage = page => ['details', 'evidence'].includes(page) ? 'transactions' : page;
function App() {
  const [page, setPage] = useState('overview');
  const [selected, setSelected] = useState(transactions[0].id);
  const [filter, setFilter] = useState('All transactions');
  const [query, setQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [sidebarKeyboard, setSidebarKeyboard] = useState(false);
  const [tableKeyboard, setTableKeyboard] = useState(false);
  const sidebarEnabled = useRef(true);
  const sidebarRefs = useRef([]);
  const searchRef = useRef(null);
  const profileRef = useRef(null);
  const accountRef = useRef(null);
  const dialogRef = useRef(null);
  const transaction = transactions.find(item => item.id === selected);
  const dossier = dossiers[selected];
  const go = destination => { setPage(destination); window.scrollTo({ top: 0 }); };
  const open = item => { setSelected(item.id); go('details'); };
  const filtered = transactions.filter(item => (filter === 'All transactions' || item.readiness.status === (filter === 'Incomplete' ? 'INCOMPLETE' : 'NEEDS_REVIEW')) && (!query.trim() || item.paypalCaptureId === query.trim()));
  useEffect(() => {
    if (!settingsOpen) return;
    const dialog = dialogRef.current;
    dialog.showModal(); dialog.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = previous; profileRef.current?.focus(); };
  }, [settingsOpen]);
  useEffect(() => {
    const click = event => {
      sidebarEnabled.current = Boolean(event.target.closest?.('[data-sidebar-tab]'));
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false);
    };
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, []);
  useEffect(() => {
    const keys = event => {
      if (event.defaultPrevented || signedOut || settingsOpen) return;
      const editing = event.target.closest?.('input, textarea, select, [role="combobox"], [contenteditable="true"]');
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setAccountOpen(false); sidebarEnabled.current = false; go('transactions');
        requestAnimationFrame(() => { searchRef.current?.focus(); searchRef.current?.select(); }); return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        if (accountOpen) { setAccountOpen(false); profileRef.current?.focus(); return; }
        if (editing) { event.target.blur(); return; }
        if (page === 'evidence') { go('details'); return; }
        if (page === 'details') { go('transactions'); return; }
        sidebarEnabled.current = true; setSidebarKeyboard(true); setTableKeyboard(false);
        sidebarRefs.current[Math.max(0, nav.findIndex(([id]) => id === rootPage(page)))]?.focus(); return;
      }
      if (editing || accountOpen || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (page === 'details' && event.key === 'Enter' && !event.target.closest?.('button, a')) {
        event.preventDefault();
        go('evidence');
        return;
      }
      if (page === 'transactions' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault(); sidebarEnabled.current = false;
        const filters = ['All transactions', 'Incomplete', 'Needs review'];
        const next = (filters.indexOf(filter) + (event.key === 'ArrowRight' ? 1 : -1) + 3) % 3;
        setFilter(filters[next]); document.querySelectorAll('.transaction-filters button')[next]?.focus(); return;
      }
      if (sidebarEnabled.current && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault(); setSidebarKeyboard(true);
        const index = nav.findIndex(([id]) => id === rootPage(page));
        const next = (index + (event.key === 'ArrowDown' ? 1 : -1) + nav.length) % nav.length;
        go(nav[next][0]); sidebarRefs.current[next]?.focus(); return;
      }
      if (page === 'transactions' && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault(); setTableKeyboard(true);
        const rows = Array.from(document.querySelectorAll('.transactions-table tbody tr'));
        const index = rows.indexOf(document.activeElement);
        const next = index < 0 ? (event.key === 'ArrowDown' ? 0 : rows.length - 1) : (index + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
        rows[next]?.focus();
      }
    };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  }, [page, filter, signedOut, settingsOpen, accountOpen]);
  const crumbs = [{ name: nav.find(([id]) => id === rootPage(page))?.[2], target: rootPage(page) }, ...(['details', 'evidence'].includes(page) ? [{ name: transaction.paypalCaptureId, target: 'details' }] : []), ...(page === 'evidence' ? [{ name: 'Evidence', target: 'evidence' }] : [])];
  function table() {
    return <Card><div className={`table-wrap ${tableKeyboard ? 'table-keyboard-mode' : 'table-pointer-mode'}`} onPointerMove={event => { if (event.movementX || event.movementY) setTableKeyboard(false); }} onPointerDown={() => setTableKeyboard(false)} onFocus={event => { if (event.target.tagName === 'TR') setTableKeyboard(true); }}><table className="transactions-table"><colgroup><col className="col-purchase" /><col className="col-date" /><col className="col-amount" /><col className="col-status" /><col className="col-protection" /></colgroup><thead><tr>{['Order', 'Payment received', 'Amount', 'Payment status', 'Readiness'].map(name => <th key={name}>{name}</th>)}</tr></thead><tbody>{filtered.map(item => <tr key={item.id} tabIndex={0} onClick={() => open(item)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(item); } }}><td><div className="product"><ProductThumbnail /><div><strong>{item.order?.externalId || item.merchantOrderReference || 'Unlinked order'}</strong><small>{item.order ? `${item.order.items.reduce((total, product) => total + product.quantity, 0)} ${item.order.items.reduce((total, product) => total + product.quantity, 0) === 1 ? 'item' : 'items'}` : 'Items unavailable'}</small></div></div></td><td>{date(item.capturedAt)}</td><td>{money(item.amount)}</td><td><Badge>{label(item.status)}</Badge></td><td><Badge>{label(item.readiness.status)}</Badge></td></tr>)}</tbody></table>{!filtered.length && <div className="empty-state">No matching transactions.</div>}</div></Card>;
  }
  function readiness() {
    return <Card><div className="card-heading"><h2>Document coverage</h2></div><div className="readiness-checks">{transaction.readiness.checks.map(check => <div className="settings-info-row" key={check.code}><span>{label(check.code)}</span><Badge>{label(check.status)}</Badge></div>)}</div><div className="card-bottom"><button className="button primary" onClick={() => go('evidence')}>View evidence</button></div></Card>;
  }
  if (signedOut) return <div className="signed-out"><Card><h1>You’re signed out.</h1><button className="button primary" onClick={() => { setSignedOut(false); go('overview'); }}>Return</button></Card></div>;
  return <div className="app-shell"><aside className={`sidebar ${sidebarKeyboard ? 'sidebar-keyboard-mode' : ''}`} onPointerMove={event => { if (event.movementX || event.movementY) setSidebarKeyboard(false); }} onPointerDown={() => setSidebarKeyboard(false)}><nav aria-label="Main navigation">{nav.map(([id, icon, name], index) => <button data-sidebar-tab key={id} ref={element => { sidebarRefs.current[index] = element; }} className={`nav-item ${rootPage(page) === id ? 'active' : ''}`} aria-current={rootPage(page) === id ? 'page' : undefined} onClick={() => go(id)}><span aria-hidden="true">{icon}</span>{name}</button>)}</nav></aside><main><header className="topbar"><nav className="breadcrumb" aria-label="Breadcrumb"><ol>{crumbs.map((crumb, index) => <li key={index}>{index > 0 && <span className="breadcrumb-separator">/</span>}{index === crumbs.length - 1 ? <span className="breadcrumb-current" aria-current="page">{crumb.name}</span> : <a href={`#${crumb.target}`} onClick={event => { event.preventDefault(); go(crumb.target); }}>{crumb.name}</a>}</li>)}</ol></nav><div className="topbar-right"><div className="account-dropdown" ref={accountRef}><button className="account-profile" ref={profileRef} aria-label="Account menu" aria-expanded={accountOpen} onClick={() => setAccountOpen(!accountOpen)}><ProfileAvatar small /></button>{accountOpen && <div className="account-menu"><button onClick={() => { setAccountOpen(false); setSettingsOpen(true); }}><span aria-hidden="true">⚙</span>Settings</button><button onClick={() => { setAccountOpen(false); setSignedOut(true); }}><span aria-hidden="true">↪</span>Log out</button></div>}</div></div></header><div className="workspace">
    {page === 'overview' && <><div className="stats-grid">{[['Transactions', transactions.length], ['Ready', transactions.filter(item => item.readiness.status === 'READY').length], ['Incomplete', transactions.filter(item => item.readiness.status === 'INCOMPLETE').length], ['Needs review', transactions.filter(item => item.readiness.status === 'NEEDS_REVIEW').length]].map(([name, value]) => <Card key={name}><div className="stat-label">{name}</div><div className="stat-value">{value}</div></Card>)}</div><div className="two-column"><Card><div className="card-heading"><h2>Transactions needing attention</h2></div>{transactions.filter(item => item.readiness.status !== 'READY').map(item => <button className="settings-purchase" key={item.id} onClick={() => open(item)}><span><strong>{transactionName(item)}</strong><small>{transactionSubtitle(item)}</small></span><Badge>{label(item.readiness.status)}</Badge></button>)}</Card><Card><div className="card-heading"><h2>Merchant</h2></div><dl><div><dt>Name</dt><dd>{merchant.displayName}</dd></div><div><dt>Role</dt><dd>{merchant.role}</dd></div><div><dt>PayPal connection</dt><dd>{label(integration.connectionStatus)}</dd></div><div><dt>Approval required</dt><dd>Yes</dd></div></dl><div className="card-bottom"><button className="button secondary" onClick={() => setSettingsOpen(true)}>Settings</button></div></Card></div></>}
    {page === 'transactions' && <><div className="filters transaction-toolbar"><TransactionFilters value={filter} onChange={setFilter} /><div className="search-field"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg><input type="text" className="search" ref={searchRef} aria-label="Search by exact capture ID" aria-keyshortcuts="Meta+k Control+k" placeholder="Search capture ID" value={query} onChange={event => setQuery(event.target.value)} /><kbd className="search-shortcut">⌘K</kbd></div></div>{table()}</>}
    {page === 'details' && <div className="two-column detail-grid"><PurchaseSummary order={transaction} />{readiness()}</div>}
    {page === 'evidence' && <><div className="evidence-toolbar"><div className="case-bar"><strong>{transaction.paypalCaptureId}</strong></div><EvidenceHistory key={dossier.id} dossier={dossier} /></div><div className="evidence-records">{transaction.readiness.checks.map(check => {
      const records = dossier.items.filter(item => check.evidenceIds.includes(item.id));
      const done = check.status === 'PRESENT' && records.length > 0 && records.every(item => item.integrity === 'VALID');
      return <Card key={check.code}><div className="card-heading"><h2>{label(check.code)}</h2><Badge>{done ? 'Done' : 'Needs attention'}</Badge></div>
        {records.length ? records.map(item => <dl key={item.id}><div><dt>Source</dt><dd>{item.sourceKind}</dd></div><div><dt>System</dt><dd>{item.sourceSystem}</dd></div><div><dt>Retrieved</dt><dd>{date(item.retrievedAt)}</dd></div><div><dt>Integrity</dt><dd>{label(item.integrity)}</dd></div></dl>) : <p className="evidence-missing">{check.status === 'CONFLICT' ? 'Conflicting records require review.' : 'Additional evidence needed.'}</p>}
        {!done && <EvidenceUpload key={`${transaction.id}-${check.code}`} category={label(check.code)} />}
      </Card>;
    })}</div></>}
    {page === 'disputes' && <RestoredDisputes transaction={transactions[0]} />}
    {page === 'activity' && <DisputeWorkspace page={page} transaction={transactions[0]} onTransaction={() => open(transactions[0])} onEvidence={() => { setSelected(transactions[0].id); go('evidence'); }} />}
  </div></main><dialog className="settings-dialog" ref={dialogRef} tabIndex={-1} aria-label="Settings" onCancel={() => setSettingsOpen(false)} onClose={() => setSettingsOpen(false)} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setSettingsOpen(false); } }}><button className="settings-close" aria-label="Close settings" onClick={() => setSettingsOpen(false)}>×</button><Settings merchant={merchant} integration={integration} isOpen={settingsOpen} /></dialog></div>;
}
createRoot(document.getElementById('root')).render(<App />);
