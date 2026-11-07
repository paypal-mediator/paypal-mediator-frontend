import EvidenceScreen from './EvidenceScreen';
import RestoredDisputes from './RestoredDisputes';
import DisputeWorkspace from './DisputeWorkspace';
import Badge from './Badge';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ProfileAvatar from './ProfileAvatar';
import ProductThumbnail from './ProductThumbnail';
import PurchaseSummary from './PurchaseSummary';
import TransactionFilters from './TransactionFilters';
import Settings from './Settings';
import TeamOptions from './TeamOptions';
import SidebarIcon from './SidebarIcon';
import CreateMerchantDialog from './CreateMerchantDialog';
import { transactions as allTransactions, evidenceSnapshots, merchants, account as accountFixture, integration as defaultIntegration } from './data/fixtures';
import { date, label, money, transactionName, transactionSubtitle } from './lib/format';
import './styles.css';
const nav = [['overview', '◫', 'Overview'], ['transactions', '▦', 'Transactions'], ['disputes', '◎', 'Disputes'], ['activity', '◷', 'Agent Activity']];
const Card = ({ children, className = '' }) => <section className={`card ${className}`}>{children}</section>;
const rootPage = page => ['details', 'evidence'].includes(page) ? 'transactions' : page;
function loadProfile(scope, fallback) {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(`${scope}:${fallback.id}:profile`) || '{}'), id: fallback.id }; }
  catch { return fallback; }
}
function loadMerchants() {
  let created = [];
  try { const saved = JSON.parse(localStorage.getItem(`account:${accountFixture.id}:created-teams`)); if (Array.isArray(saved)) created = saved.filter(item => item && typeof item.id === 'string' && typeof item.displayName === 'string'); } catch { /* Use fixture memberships. */ }
  return [...merchants, ...created.filter(item => !merchants.some(team => team.id === item.id))].map(item => loadProfile('merchant', item));
}
function App() {
  const [page, setPage] = useState('overview');
  const [selected, setSelected] = useState(allTransactions[0].id);
  const [filter, setFilter] = useState('All transactions');
  const [query, setQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsScope, setSettingsScope] = useState('account');
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [merchantProfiles, setMerchantProfiles] = useState(loadMerchants);
  const [activeMerchantId, setActiveMerchantId] = useState(() => {
    try { const saved = localStorage.getItem(`account:${accountFixture.id}:active-merchant`); return merchantProfiles.some(item => item.id === saved) ? saved : merchantProfiles[0].id; }
    catch { return merchants[0].id; }
  });
  const [expandedTeams, setExpandedTeams] = useState(() => merchantProfiles.map(item => item.id));
  const arrangementKey = `account:${accountFixture.id}:team-arrangement`;
  const [teamArrangement, setTeamArrangement] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem(arrangementKey)); return { order: Array.isArray(saved?.order) ? saved.order : [], pinned: Array.isArray(saved?.pinned) ? saved.pinned : [] }; }
    catch { return { order: [], pinned: [] }; }
  });
  const [arrangementError, setArrangementError] = useState('');
  const orderedTeams = [...merchantProfiles].sort((a, b) => {
    const pinDifference = Number(teamArrangement.pinned.includes(b.id)) - Number(teamArrangement.pinned.includes(a.id));
    const rank = id => { const index = teamArrangement.order.indexOf(id); return index < 0 ? teamArrangement.order.length + merchantProfiles.findIndex(item => item.id === id) : index; };
    return pinDifference || rank(a.id) - rank(b.id);
  });
  const arrangeTeams = next => {
    try { localStorage.setItem(arrangementKey, JSON.stringify(next)); setTeamArrangement(next); setArrangementError(''); }
    catch { setArrangementError('Could not save the team order. Please try again.'); }
  };
  const moveTeam = (id, direction) => {
    const order = orderedTeams.map(team => team.id);
    const index = order.indexOf(id), target = index + direction;
    if (target < 0 || target >= order.length || teamArrangement.pinned.includes(id) !== teamArrangement.pinned.includes(order[target])) return;
    [order[index], order[target]] = [order[target], order[index]];
    arrangeTeams({ ...teamArrangement, order });
  };
  const pinTeam = id => arrangeTeams({ order: orderedTeams.map(team => team.id), pinned: teamArrangement.pinned.includes(id) ? teamArrangement.pinned.filter(item => item !== id) : [...teamArrangement.pinned, id] });
  const merchant = merchantProfiles.find(item => item.id === activeMerchantId);
  const integration = merchant.integration || defaultIntegration;
  const transactions = allTransactions.filter(item => item.merchantId === activeMerchantId);
  const selectTeam = (id, destination = 'overview') => {
    setActiveMerchantId(id); setPage(destination); setQuery(''); setFilter('All transactions');
    setSelected(allTransactions.find(item => item.merchantId === id)?.id ?? null);
    try { localStorage.setItem(`account:${accountFixture.id}:active-merchant`, id); } catch { /* Navigation remains available without storage. */ }
    window.scrollTo({ top: 0 });
  };
  const [account, setAccount] = useState(() => loadProfile('account', accountFixture));
  const createTeam = details => {
    const name = details.displayName;
    if (merchantProfiles.some(team => team.displayName.toLowerCase() === name.toLowerCase())) throw new Error('You already have a merchant with this name.');
    const team = { ...details, id: crypto.randomUUID(), displayName: name, role: 'ADMIN', policy: { allowInvestigations: false, allowSubmissions: false, requireMerchantApproval: true } };
    const next = [...merchantProfiles, team];
    // Commit the membership registry last so partially failed writes never expose a team.
    localStorage.setItem(`merchant:${team.id}:profile`, JSON.stringify(Object.fromEntries(['displayName', 'contactName', 'email', 'phone', 'timezone'].map(key => [key, details[key]]))));
    localStorage.setItem(`merchant:${team.id}:team`, JSON.stringify([{ id: account.id, name: account.displayName, email: account.email, role: 'Admin', status: 'Active' }]));
    localStorage.setItem(`account:${account.id}:created-teams`, JSON.stringify(next.filter(item => !merchants.some(fixture => fixture.id === item.id))));
    setMerchantProfiles(next); setExpandedTeams(items => [...items, team.id]);
    setCreateTeamOpen(false); selectTeam(team.id);
  };
  const openSettings = scope => { setSettingsScope(scope); setAccountOpen(false); setSettingsOpen(true); };
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
    const usePointer = event => {
      if (event.type === 'pointermove' && !event.movementX && !event.movementY) return;
      setSidebarKeyboard(false);
    };
    window.addEventListener('pointermove', usePointer);
    window.addEventListener('pointerdown', usePointer);
    return () => {
      window.removeEventListener('pointermove', usePointer);
      window.removeEventListener('pointerdown', usePointer);
    };
  }, []);
  useEffect(() => {
    const click = event => {
      sidebarEnabled.current = Boolean(event.target.closest?.('[data-sidebar-tab], .team-folder'));
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false);
    };
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, []);
  useEffect(() => {
    const keys = event => {
      if (event.defaultPrevented || signedOut || settingsOpen || createTeamOpen) return;
      const editing = event.target.closest?.('input, textarea, select, [role="combobox"], [contenteditable="true"]');
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setAccountOpen(false); sidebarEnabled.current = false;
        if (page === 'evidence') {
          const input = document.querySelector('input[aria-label="Search evidence"]');
          input?.focus(); input?.select();
        } else {
          go('transactions');
          requestAnimationFrame(() => { searchRef.current?.focus(); searchRef.current?.select(); });
        }
        return;
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
      if ((sidebarEnabled.current || event.target.closest?.('.team-sidebar')) && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault(); setSidebarKeyboard(true); sidebarEnabled.current = true;
        const items = [...document.querySelectorAll('.team-sidebar .team-folder, .team-sidebar [data-sidebar-tab]')].filter(item => !item.closest('[hidden]'));
        if (!items.length) return;
        const focused = items.indexOf(document.activeElement);
        const index = focused >= 0 ? focused : items.findIndex(item => item.getAttribute('aria-current') === 'page');
        const next = items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
        next.focus();
        if (next.hasAttribute('data-sidebar-tab')) next.click();
        next.scrollIntoView({ block: 'nearest' });
        return;
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
  }, [page, filter, signedOut, settingsOpen, accountOpen, activeMerchantId, createTeamOpen]);
  const crumbs = [{ name: merchant.displayName, target: 'overview' }, { name: nav.find(([id]) => id === rootPage(page))?.[2], target: rootPage(page) }, ...(['details', 'evidence'].includes(page) ? [{ name: transaction.paypalCaptureId, target: 'details' }] : []), ...(page === 'evidence' ? [{ name: 'Evidence', target: 'evidence' }] : [])];
  function table() {
    return <Card><div className={`table-wrap ${tableKeyboard ? 'table-keyboard-mode' : 'table-pointer-mode'}`} onPointerMove={event => { if (event.movementX || event.movementY) setTableKeyboard(false); }} onPointerDown={() => setTableKeyboard(false)} onFocus={event => { if (event.target.tagName === 'TR') setTableKeyboard(true); }}><table className="transactions-table"><colgroup><col className="col-purchase" /><col className="col-date" /><col className="col-amount" /><col className="col-status" /><col className="col-protection" /></colgroup><thead><tr>{['Order', 'Payment received', 'Amount', 'Payment status', 'Readiness'].map(name => <th key={name}>{name}</th>)}</tr></thead><tbody>{filtered.map(item => <tr key={item.id} tabIndex={0} onClick={() => open(item)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(item); } }}><td><div className="product"><ProductThumbnail /><div><strong>{item.order?.externalId || item.merchantOrderReference || 'Unlinked order'}</strong><small>{item.order ? `${item.order.items.reduce((total, product) => total + product.quantity, 0)} ${item.order.items.reduce((total, product) => total + product.quantity, 0) === 1 ? 'item' : 'items'}` : 'Items unavailable'}</small></div></div></td><td>{date(item.capturedAt)}</td><td>{money(item.amount)}</td><td><Badge>{label(item.status)}</Badge></td><td><Badge>{label(item.readiness.status)}</Badge></td></tr>)}</tbody></table>{!filtered.length && <div className="empty-state">No matching transactions.</div>}</div></Card>;
  }
  function readiness() {
    return <Card><div className="card-heading"><h2>Document coverage</h2></div><div className="readiness-checks">{transaction.readiness.checks.map(check => <div className="settings-info-row" key={check.code}><span>{label(check.code)}</span><Badge>{label(check.status)}</Badge></div>)}</div><div className="card-bottom"><button className="button primary" onClick={() => go('evidence')}>View evidence</button></div></Card>;
  }
  if (signedOut) return <div className="signed-out"><Card><h1>You’re signed out.</h1><button className="button primary" onClick={() => { setSignedOut(false); go('overview'); }}>Return</button></Card></div>;
  return <div className="app-shell"><aside className={`sidebar ${sidebarKeyboard ? 'sidebar-keyboard-mode' : ''}`} onPointerMove={event => { if (event.movementX || event.movementY) setSidebarKeyboard(false); }} onPointerDown={() => setSidebarKeyboard(false)}><nav aria-label="Teams" className="team-sidebar">{orderedTeams.map((team, teamIndex) => {
    const expanded = expandedTeams.includes(team.id);
    const current = activeMerchantId === team.id;
    const pinned = teamArrangement.pinned.includes(team.id);
    const sameGroup = index => orderedTeams[index] && teamArrangement.pinned.includes(orderedTeams[index].id) === pinned;
    return <div className="sidebar-team" key={team.id}>
      <div className="team-heading-row"><button className={`team-folder ${current ? 'current' : ''}`} aria-label={team.displayName} aria-expanded={expanded} aria-controls={`team-nav-${team.id}`} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); } if (event.key === 'ArrowRight') setExpandedTeams(items => [...new Set([...items, team.id])]); if (event.key === 'ArrowLeft') setExpandedTeams(items => items.filter(id => id !== team.id)); }} onClick={() => setExpandedTeams(items => expanded ? items.filter(id => id !== team.id) : [...items, team.id])}>
        <SidebarIcon name="folder" /><span>{team.displayName}</span><svg className="team-toggle-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={expanded ? 'm4 6 4 4 4-4' : 'm6 4 4 4-4 4'} /></svg>{pinned && <svg className="team-pinned-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-label="Pinned"><path d="m8 3 8 0-1 7 4 4H5l4-4-1-7ZM12 14v7"/></svg>}
      </button><TeamOptions name={team.displayName} pinned={pinned} canMoveUp={Boolean(sameGroup(teamIndex - 1))} canMoveDown={Boolean(sameGroup(teamIndex + 1))} onMove={direction => moveTeam(team.id, direction)} onPin={() => pinTeam(team.id)} /></div>
      <div className="team-folder-pages" id={`team-nav-${team.id}`} hidden={!expanded}>{nav.map(([id, icon, name], index) => <button data-sidebar-tab key={id} ref={element => { if (current) sidebarRefs.current[index] = element; }} className={`nav-item ${current && rootPage(page) === id ? 'active' : ''}`} aria-current={current && rootPage(page) === id ? 'page' : undefined} onClick={() => selectTeam(team.id, id)}><SidebarIcon name={id} />{name}</button>)}</div>
    </div>;
  })}<div className="team-heading-row"><button type="button" className="team-folder new-team-option" onClick={() => setCreateTeamOpen(true)}><svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg><span>New team</span></button></div>{arrangementError && <p className="team-arrangement-error" role="alert">{arrangementError}</p>}</nav></aside><main><header className="topbar"><nav className="breadcrumb" aria-label="Breadcrumb"><ol>{crumbs.map((crumb, index) => <li key={index}>{index > 0 && <span className="breadcrumb-separator">/</span>}{index === 0 ? <span className="breadcrumb-root">{crumb.name}</span> : index === crumbs.length - 1 ? <span className="breadcrumb-current" aria-current="page">{crumb.name}</span> : <a href={`#${crumb.target}`} onClick={event => { event.preventDefault(); go(crumb.target); }}>{crumb.name}</a>}</li>)}</ol></nav><div className="topbar-right"><div className="account-dropdown" ref={accountRef}><button className="account-profile" ref={profileRef} aria-label="Account menu" aria-expanded={accountOpen} onClick={() => setAccountOpen(!accountOpen)}><ProfileAvatar small /></button>{accountOpen && <div className="account-menu"><button onClick={() => openSettings('account')}><span aria-hidden="true">⚙</span>Account settings</button><button onClick={() => openSettings('merchant')}><span aria-hidden="true">⚙</span>Merchant settings</button><button onClick={() => { setAccountOpen(false); setSignedOut(true); }}><span aria-hidden="true">↪</span>Log out</button></div>}</div></div></header><div className="workspace">
    {page === 'overview' && <><div className="stats-grid">{[['Transactions', transactions.length], ['Ready', transactions.filter(item => item.readiness.status === 'READY').length], ['Incomplete', transactions.filter(item => item.readiness.status === 'INCOMPLETE').length], ['Needs review', transactions.filter(item => item.readiness.status === 'NEEDS_REVIEW').length]].map(([name, value]) => <Card key={name}><div className="stat-label">{name}</div><div className="stat-value">{value}</div></Card>)}</div><div className="two-column"><Card><div className="card-heading"><h2>Transactions needing attention</h2></div>{!transactions.length && <p>No transactions yet for this team.</p>}{transactions.filter(item => item.readiness.status !== 'READY').map(item => <button className="settings-purchase" key={item.id} onClick={() => open(item)}><span><strong>{transactionName(item)}</strong><small>{transactionSubtitle(item)}</small></span><Badge>{label(item.readiness.status)}</Badge></button>)}</Card><Card><div className="card-heading"><h2>Merchant</h2></div><dl><div><dt>Name</dt><dd>{merchant.displayName}</dd></div><div><dt>Role</dt><dd>{merchant.role}</dd></div><div><dt>PayPal connection</dt><dd>{label(integration.connectionStatus)}</dd></div><div><dt>Approval required</dt><dd>Yes</dd></div></dl><div className="card-bottom"><button className="button secondary" onClick={() => openSettings('merchant')}>Merchant settings</button></div></Card></div></>}
    {page === 'transactions' && <><div className="filters transaction-toolbar"><TransactionFilters value={filter} onChange={setFilter} /><div className="search-field" onClick={() => searchRef.current?.focus()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg><input type="text" className="search" ref={searchRef} aria-label="Search by exact capture ID" aria-keyshortcuts="Meta+k Control+k" placeholder="Search capture ID" value={query} onChange={event => setQuery(event.target.value)} /><kbd className="search-shortcut">⌘K</kbd></div></div>{table()}</>}
    {page === 'details' && <div className="two-column detail-grid"><PurchaseSummary order={transaction} />{readiness()}</div>}
    {page === 'evidence' && <EvidenceScreen key={transaction.id} transaction={transaction} snapshots={evidenceSnapshots[transaction.id]} />}
    {page === 'disputes' && (transactions.length ? <RestoredDisputes key={merchant.id} transaction={transactions[0]} /> : <Card><h2>No disputes yet</h2><p>Disputes for {merchant.displayName} will appear here.</p></Card>)}
    {page === 'activity' && (transactions.length ? <DisputeWorkspace key={merchant.id} page={page} transaction={transactions[0]} onTransaction={() => open(transactions[0])} onEvidence={() => { setSelected(transactions[0].id); go('evidence'); }} /> : <Card><h2>No activity yet</h2><p>Team activity for {merchant.displayName} will appear here.</p></Card>)}
  </div></main><dialog className="settings-dialog" ref={dialogRef} tabIndex={-1} aria-label={settingsScope === 'merchant' ? 'Merchant settings' : 'Account settings'} onCancel={() => setSettingsOpen(false)} onClose={() => setSettingsOpen(false)} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setSettingsOpen(false); } }}><button className="settings-close" aria-label="Close settings" onClick={() => setSettingsOpen(false)}>×</button><Settings key={`${settingsScope}:${merchant.id}`} merchant={merchant} account={account} integration={integration} scope={settingsScope} onProfileSave={profile => { if (settingsScope === 'merchant') setMerchantProfiles(items => items.map(item => item.id === activeMerchantId ? { ...item, ...profile } : item)); else setAccount(current => ({ ...current, ...profile })); }} /></dialog>{createTeamOpen && <CreateMerchantDialog account={account} onCreate={createTeam} onClose={() => setCreateTeamOpen(false)} />}</div>;
}
createRoot(document.getElementById('root')).render(<App />);
