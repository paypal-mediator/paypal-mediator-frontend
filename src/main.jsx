import ProfileAvatar from './ProfileAvatar';
import ProductThumbnail from './ProductThumbnail';
import PurchaseSummary from './PurchaseSummary';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import InitialMockup from './InitialMockup';
import Settings from './Settings';
import MerchantScreens from './MerchantScreens';

const initialOrders = [
  { id: '1042', name: 'Studio headphones', seller: 'Audio Supply', buyer: 'Alex Morgan', price: 249, date: 'Nov 2, 2026', status: 'In mediation', imageUrl: null, itemCount: 1, transactionId: 'TXN-1042', buyerEmail: 'alex@example.com', paymentLabel: 'Paid ···· 4242', delivery: { carrier: 'UPS', trackingNumber: '1Z1042000001', deliveredAt: 'Nov 4, 2026' }, protectionStatus: 'Records ready', dispute: { caseId: 'M-1042', reason: 'Item not as described', status: 'In mediation', responseDeadline: 'Nov 9, 2026 · 5:00 PM PT' }, breakdown: { subtotal: 225, shipping: 6, tax: 18, refunded: 0 }, items: [{ name: 'Studio headphones', sku: 'AUD-ST-001', variant: 'Black', quantity: 1, unitPrice: 225 }] },
  { id: '1041', name: 'Mechanical keyboard', seller: 'Key Studio', buyer: 'Alex Morgan', price: 129, date: 'Oct 30, 2026', status: 'In transit', imageUrl: null, itemCount: 1, transactionId: 'TXN-1041', buyerEmail: 'alex@example.com', paymentLabel: 'Paid ···· 4242', delivery: { carrier: 'USPS', trackingNumber: null, expectedAt: 'Nov 6, 2026' }, protectionStatus: 'Needs tracking', dispute: null, breakdown: { subtotal: 115, shipping: 5, tax: 9, refunded: 0 }, items: [{ name: 'Mechanical keyboard', sku: 'KEY-MK-001', variant: 'Charcoal · US layout', quantity: 1, unitPrice: 115 }] },
  { id: '1038', name: 'Desk lamp', seller: 'Form Objects', buyer: 'Alex Morgan', price: 85, date: 'Oct 24, 2026', status: 'Delivered', imageUrl: null, itemCount: 1, transactionId: 'TXN-1038', buyerEmail: 'alex@example.com', paymentLabel: 'Paid ···· 4242', delivery: { carrier: 'FedEx', trackingNumber: '103800000001', deliveredAt: 'Oct 27, 2026' }, protectionStatus: 'Records ready', dispute: null, breakdown: { subtotal: 75, shipping: 4, tax: 6, refunded: 0 }, items: [{ name: 'Desk lamp', sku: 'FORM-DL-001', variant: 'Matte black', quantity: 1, unitPrice: 75 }] },
  { id: '1034', name: 'Everyday backpack', seller: 'Carry Goods', buyer: 'Alex Morgan', price: 110, date: 'Oct 18, 2026', status: 'Resolved', imageUrl: null, itemCount: 1, transactionId: 'TXN-1034', buyerEmail: 'alex@example.com', paymentLabel: 'Paid ···· 4242', delivery: { carrier: 'UPS', trackingNumber: '1Z1034000001', deliveredAt: 'Oct 28, 2026' }, protectionStatus: 'Records ready', dispute: { caseId: 'M-1034', reason: 'Damaged item', status: 'Resolved' }, breakdown: { subtotal: 100, shipping: 2, tax: 8, refunded: 0 }, items: [{ name: 'Everyday backpack', sku: 'CARRY-BP-001', variant: 'Black · 20L', quantity: 1, unitPrice: 100 }] },
];
const nav = [['overview', '◫', 'Overview'], ['purchases', '▦', 'Transactions'], ['disputes', '◎', 'Disputes'], ['activity', '◷', 'Agent Activity']];
const money = value => `$${value.toFixed(2)}`;
function Badge({ children }) { return <span className={`badge ${String(children).toLowerCase().replaceAll(' ', '-')}`}>{children}</span>; }
function Card({ children, className = '' }) { return <section className={`card ${className}`}>{children}</section>; }
function TransactionFilters({ value, onChange }) {
  const containerRef = useRef(null);
  const [position, setPosition] = useState(null);
  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = () => {
      const selected = container.querySelector('[aria-pressed="true"]');
      if (selected) setPosition({ left: selected.offsetLeft, top: selected.offsetTop, width: selected.offsetWidth, height: selected.offsetHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    Array.from(container.querySelectorAll('button')).forEach(button => observer.observe(button));
    return () => observer.disconnect();
  }, [value]);
  return <div className="tabs transaction-filters" ref={containerRef} role="group" aria-label="Filter transactions">
    {position && <span className="filter-highlight" style={position} aria-hidden="true" />}
    {['All transactions', 'In mediation', 'Resolved'].map(tab => <button className={value === tab ? 'selected' : ''} aria-pressed={value === tab} onClick={event => { onChange(tab); event.currentTarget.focus(); }} onKeyDown={event => {
      const tabs = ['All transactions', 'In mediation', 'Resolved'];
      const index = tabs.indexOf(value);
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'ArrowDown') {
        event.preventDefault();
        document.querySelector('.transactions-table tbody tr')?.focus();
        return;
      } else return;
      event.preventDefault();
      onChange(tabs[next]);
      containerRef.current.querySelectorAll('button')[next]?.focus();
    }} key={tab}>{tab}</button>)}
  </div>;
}
function App() {
  const [signedOut, setSignedOut] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const sidebarNavigationEnabled = useRef(true);
  const [sidebarKeyboardMode, setSidebarKeyboardMode] = useState(false);
  const sidebarTabRefs = useRef([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState('');
  const settingsDialogRef = useRef(null);
  const searchInputRef = useRef(null);
  useEffect(() => {
    const focusSearch = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        if (settingsOpen || signedOut) return;
        event.preventDefault();
        setAccountMenuOpen(false);
        setPage('purchases');
        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        });
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, [settingsOpen, signedOut]);
  useEffect(() => {
    const dialog = settingsDialogRef.current;
    if (!settingsOpen || !dialog) return;
    dialog.showModal();
    dialog.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      accountButtonRef.current?.focus();
    };
  }, [settingsOpen]);
  const accountMenuRef = useRef(null);
  const accountButtonRef = useRef(null);
  useEffect(() => {
    if (!accountMenuOpen) return;
    const dismiss = event => {
      if (!accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false);
    };
    const escape = event => {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
        accountButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [accountMenuOpen]);
  const [page, setPage] = useState('overview');
  const [role, setRole] = useState('Seller');
  const [orders] = useState(initialOrders);
  const [selected, setSelected] = useState('1042');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All transactions');
  const [issue] = useState('Item not as described');
  const [description] = useState('The left ear cup has a visible crack and the audio cuts out intermittently.');
  const [desired] = useState('Partial refund');
  const [files] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [channel, setChannel] = useState('Shared conversation');
  const [acceptedOrders, setAcceptedOrders] = useState([]);
  const accepted = acceptedOrders.includes(selected);
  const setAccepted = () => setAcceptedOrders(items => [...new Set([...items, selected])]);
  const [reviewed, setReviewed] = useState(false);
  const [notice, setNotice] = useState('');
  const [tableKeyboardMode, setTableKeyboardMode] = useState(false);
  const order = orders.find(item => item.id === selected);
  const isCase = order.status === 'In mediation' || accepted;
  const go = target => { setReviewed(false); setPage(target); setNotice(''); window.scrollTo({ top: 0 }); };
  useEffect(() => {
    const trackClick = event => {
      sidebarNavigationEnabled.current = Boolean(event.target.closest?.('[data-sidebar-tab]'));
    };
    const navigate = event => {
      if (event.defaultPrevented || !sidebarNavigationEnabled.current || settingsOpen || signedOut || accountMenuOpen) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target.closest?.('input, textarea, select, [role="combobox"], [contenteditable="true"]')) return;
      const current = page === 'details' ? 'purchases'
        : ['mediation', 'resolution', 'outcome'].includes(page) ? 'disputes' : page;
      const index = Math.max(0, nav.findIndex(([id]) => id === current));
      let next;
      if (event.key === 'ArrowDown') next = (index + 1) % nav.length;
      else if (event.key === 'ArrowUp') next = (index - 1 + nav.length) % nav.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = nav.length - 1;
      else return;
      event.preventDefault();
      setSidebarKeyboardMode(true);
      go(nav[next][0]);
      sidebarTabRefs.current[next]?.focus({ preventScroll: true });
    };
    document.addEventListener('click', trackClick);
    window.addEventListener('keydown', navigate);
    return () => {
      document.removeEventListener('click', trackClick);
      window.removeEventListener('keydown', navigate);
    };
  }, [page, settingsOpen, signedOut, accountMenuOpen]);
  useEffect(() => {
    if (page !== 'purchases' || settingsOpen || signedOut || accountMenuOpen) return;
    const navigateTransactions = event => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (target.closest?.('input, textarea, select, [role="combobox"], [contenteditable="true"]')) return;
      const tabs = ['All transactions', 'In mediation', 'Resolved'];
      const buttons = document.querySelectorAll('.transaction-filters button');
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        sidebarNavigationEnabled.current = false;
        const index = tabs.indexOf(filter);
        const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        setFilter(tabs[next]);
        buttons[next]?.focus();
      } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !sidebarNavigationEnabled.current) {
        event.preventDefault();
        const rows = Array.from(document.querySelectorAll('.transactions-table tbody tr'));
        const index = rows.indexOf(document.activeElement);
        if (event.key === 'ArrowDown') rows.length && rows[(index + 1) % rows.length]?.focus();
        else if (rows.length) rows[(index - 1 + rows.length) % rows.length]?.focus();
      }
    };
    window.addEventListener('keydown', navigateTransactions);
    return () => window.removeEventListener('keydown', navigateTransactions);
  }, [page, filter, settingsOpen, signedOut, accountMenuOpen]);
  useEffect(() => {
    const onFocus = event => {
      if (event.target.matches?.('.transactions-table tbody tr')) setTableKeyboardMode(true);
    };
    document.addEventListener('focusin', onFocus);
    return () => document.removeEventListener('focusin', onFocus);
  }, []);
  useEffect(() => {
    const returnToSidebar = event => {
      if (event.key !== 'Escape' || event.defaultPrevented || settingsOpen || signedOut || accountMenuOpen) return;
      if (event.target.closest?.('input, textarea, select, [role="combobox"], [contenteditable="true"]')) return;
      event.preventDefault();
      const parent = { details: 'purchases', mediation: 'disputes', resolution: 'mediation', outcome: 'disputes' }[page];
      if (parent) {
        sidebarNavigationEnabled.current = false;
        setSidebarKeyboardMode(false);
        setTableKeyboardMode(false);
        go(parent);
        return;
      }
      sidebarNavigationEnabled.current = true;
      setSidebarKeyboardMode(true);
      setTableKeyboardMode(false);
      const index = Math.max(0, nav.findIndex(([id]) => id === page));
      sidebarTabRefs.current[index]?.focus({ preventScroll: true });
    };
    window.addEventListener('keydown', returnToSidebar);
    return () => window.removeEventListener('keydown', returnToSidebar);
  }, [page, settingsOpen, signedOut, accountMenuOpen]);
  useEffect(() => {
    if (page !== 'details' || !order.dispute || settingsOpen || signedOut || accountMenuOpen) return;
    const openDispute = event => {
      if (event.key !== 'Enter' || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target.closest?.('button, a, input, textarea, select, [role="combobox"], [contenteditable="true"]')) return;
      event.preventDefault();
      go(order.dispute.status === 'Resolved' ? 'outcome' : 'mediation');
    };
    window.addEventListener('keydown', openDispute);
    return () => window.removeEventListener('keydown', openDispute);
  }, [page, order, settingsOpen, signedOut, accountMenuOpen]);
  const open = (item, target = 'details') => { setSelected(item.id); go(target); };
  const notify = text => { setNotice(text); };
  const breadcrumbs = [
    ...({
      overview: [{ label: 'Overview', target: 'overview' }],
      disputes: [{ label: 'Disputes', target: 'disputes' }],
      activity: [{ label: 'Agent Activity', target: 'activity' }],
      initial: [{ label: 'Initial mockup', target: 'initial' }],
      purchases: [{ label: 'Transactions', target: 'purchases' }],
      details: [{ label: 'Transactions', target: 'purchases' }, { label: `Order #${order.id}`, target: 'details' }],
      mediation: [{ label: 'Disputes', target: 'disputes' }, { label: `Case #M-${order.id}`, target: 'mediation' }],
      resolution: [{ label: 'Disputes', target: 'disputes' }, { label: `Case #M-${order.id}`, target: 'mediation' }, { label: 'Agreement review', target: 'resolution' }],
      outcome: [{ label: 'Case outcomes', target: 'outcome' }],
      settings: [{ label: 'Settings', target: 'settings' }],
    }[page] || []),
  ];

  function orderTable(items) { return <div className={`table-wrap ${tableKeyboardMode ? 'table-keyboard-mode' : 'table-pointer-mode'}`} onPointerMove={event => {
      if (event.movementX === 0 && event.movementY === 0) return;
      setTableKeyboardMode(false);
    }} onPointerDown={() => setTableKeyboardMode(false)} onKeyDown={event => {
      if (['ArrowUp', 'ArrowDown'].includes(event.key)) setTableKeyboardMode(true);
    }}><table className="transactions-table"><colgroup><col className="col-purchase" /><col className="col-buyer" /><col className="col-date" /><col className="col-amount" /><col className="col-status" /><col className="col-protection" /></colgroup><thead><tr><th>Purchase</th><th>{role === 'Buyer' ? 'Seller' : 'Buyer'}</th><th>Date</th><th>Amount</th><th>Status</th><th>Protection</th></tr></thead><tbody>{items.map(item => <tr key={item.id} tabIndex={0} aria-label={`${item.name}, order ${item.id}`} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const row = event.currentTarget;
        if (event.key === 'ArrowDown') (row.nextElementSibling || row.parentElement.firstElementChild)?.focus();
        else (row.previousElementSibling || row.parentElement.lastElementChild)?.focus();
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(item);
      }
    }} onClick={() => open(item)}><td><div className="product"><ProductThumbnail imageUrl={item.imageUrl} /><div><strong>{item.name}</strong><small>Order #{item.id}{item.itemCount > 1 && <span className="additional-items"> · +{item.itemCount - 1} {item.itemCount === 2 ? 'item' : 'items'}</span>}</small></div></div></td><td>{role === 'Buyer' ? item.seller : item.buyer}</td><td>{item.date}</td><td>{money(item.price)}</td><td><Badge>{item.status}</Badge></td><td><Badge>{item.id === '1041' ? 'Needs tracking' : 'Records ready'}</Badge></td></tr>)}</tbody></table>{!items.length && <div className="empty-state">No transactions match your search.</div>}</div>; }
  function purchaseSummary() { return <PurchaseSummary key={order.id} order={order} />; }
  if (signedOut) return <div className="signed-out"><Card><span className="brand-icon">m</span><h1>You’re signed out.</h1><button className="button primary" onClick={() => { setSignedOut(false); go('overview'); }}>Continue</button></Card></div>;
  return <div className="app-shell">
    <aside className={`sidebar ${sidebarKeyboardMode ? 'sidebar-keyboard-mode' : ''}`} onPointerMove={event => { if (event.movementX || event.movementY) setSidebarKeyboardMode(false); }} onPointerDown={() => setSidebarKeyboardMode(false)}><nav>{nav.map(([id, icon, label], index) => <button data-sidebar-tab ref={element => { sidebarTabRefs.current[index] = element; }} aria-current={page === id ? 'page' : undefined} className={`nav-item ${page === id || (id === 'purchases' && ['details'].includes(page)) || (id === 'disputes' && ['mediation', 'resolution', 'outcome'].includes(page)) ? 'active' : ''}`} key={id} onClick={() => { if (id === 'mediation' || id === 'outcome') setSelected('1042'); go(id); }}><span>{icon}</span>{label}{id === 'disputes' && <span className="nav-count">1</span>}</button>)}</nav></aside>
    <main><header className="topbar"><nav className="breadcrumb" aria-label="Breadcrumb"><ol>{breadcrumbs.map((crumb, index) => <li key={`${crumb.target}-${index}`}>{index > 0 && <span className="breadcrumb-separator" aria-hidden="true">/</span>}{index === breadcrumbs.length - 1 ? <span className="breadcrumb-current" aria-current="page">{crumb.label}</span> : <a href={`#${crumb.target}`} onClick={event => { event.preventDefault(); go(crumb.target); }}>{crumb.label}</a>}</li>)}</ol></nav><div className="topbar-right"><div className="account-dropdown" ref={accountMenuRef} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setAccountMenuOpen(false); }}><button ref={accountButtonRef} className="account-profile" aria-label="Account menu" aria-expanded={accountMenuOpen} aria-controls="account-menu" onClick={() => setAccountMenuOpen(open => !open)}><ProfileAvatar small /></button>{accountMenuOpen && <div className="account-menu" id="account-menu"><button onClick={() => { setAccountMenuOpen(false); setSettingsNotice(''); setSettingsOpen(true); }}><svg className="account-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 3-.6 2.4-2.1 1.2L4 6l-2 3.5L3.7 11v2L2 14.5 4 18l2.3-.6 2.1 1.2L9 21h4l.6-2.4 2.1-1.2 2.3.6 2-3.5-1.7-1.5v-2L20 9.5 18 6l-2.3.6-2.1-1.2L13 3Z" /><circle cx="11" cy="12" r="3" /></svg><span>Settings</span></button><button onClick={() => { setAccountMenuOpen(false); setSignedOut(true); }}><svg className="account-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M9 12h12m-4-4 4 4-4 4" /></svg><span>Log out</span></button></div>}</div></div></header>
    <div className="workspace">{page === 'initial' ? <InitialMockup /> : <>
    {notice && <div className="notice" role="status">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></div>}
    {['overview', 'disputes', 'activity'].includes(page) && <MerchantScreens page={page} orders={orders} go={go} open={open} />}
    {page === 'purchases' && <><div className="filters transaction-toolbar"><TransactionFilters value={filter} onChange={setFilter} /><div className="search-field"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg><input ref={searchInputRef} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.currentTarget.blur(); } }} className="search" type="text" aria-keyshortcuts="Meta+k Control+k" aria-label="Search transactions" placeholder="Search transactions…" value={query} onChange={event => setQuery(event.target.value)} /><kbd className="search-shortcut" aria-hidden="true">⌘K</kbd></div></div><Card>{orderTable(orders.filter(item => (filter === 'All transactions' || item.status === filter) && `${item.name} ${item.seller} ${item.id}`.toLowerCase().includes(query.toLowerCase())))}</Card></>}
    {page === 'details' && <><div className="two-column detail-grid">{purchaseSummary()}<Card><div className="card-heading"><h2>Purchase timeline</h2><Badge>{order.status}</Badge></div><div className="timeline"><div><i /><strong>Order placed</strong><p>Payment of {money(order.price)} confirmed.</p><small>{order.date}</small></div><div><i /><strong>{order.status === 'In transit' ? 'Package shipped' : 'Package delivered'}</strong><p>{order.status === 'In transit' ? 'Your purchase is on its way.' : 'Delivery was recorded by the seller.'}</p></div>{isCase && <div><i /><strong>Mediation opened</strong><p>Both parties are reviewing a proposed resolution.</p></div>}</div>{order.dispute && <div className="card-bottom"><button className="button primary" onClick={() => go(order.dispute.status === 'Resolved' ? 'outcome' : 'mediation')}>View dispute ↗</button></div>}</Card></div></>}
    {page === 'mediation' && <><div className="case-bar"><div><span className="status-dot" /><strong>Case #M-{order.id}</strong><span className="muted">{order.name}</span></div><Badge>{accepted ? 'Agreement accepted' : 'In mediation'}</Badge></div><div className="mediation-grid"><Card className="conversation-card"><div className="tabs conversation-tabs">{['Shared conversation', 'Private AI assistance'].map(tab => <button className={channel === tab ? 'selected' : ''} key={tab} onClick={() => setChannel(tab)}>{tab === 'Private AI assistance' ? '♧ ' : ''}{tab}</button>)}</div><div className="channel-note">{channel === 'Shared conversation' ? 'Visible to you, the other party, and the AI mediator.' : 'Only visible to you. Private guidance is not sent to the other party.'}</div><div className="messages">{channel === 'Shared conversation' ? <><div className="message"><div className="message-meta"><span className="avatar">AM</span><strong>Alex Morgan</strong><small>Buyer · 9:42 AM</small></div><p>{order.id === '1042' ? 'The headphones arrived with a crack on the left ear cup. The audio also cuts out. I’d like help finding a fair solution.' : description}</p><div className="attachments">{(files.length ? files : order.id === '1042' ? ['ear-cup-photo.jpg', 'order-receipt.pdf'] : []).map(file => <span key={file}>▧ {file}</span>)}</div></div><div className="message ai-message"><div className="message-meta"><span className="avatar ai">✧</span><strong>Middle AI</strong><Badge>Mediator</Badge></div><p>I’ve summarized the concern and attached evidence. Let’s clarify the condition of the item and explore an option that works for both sides.</p></div><div className="message"><div className="message-meta"><span className="avatar">AS</span><strong>{order.seller}</strong><small>Seller · 10:12 AM</small></div><p>I’m sorry to hear about the condition. We can offer a $60 partial refund if you’d prefer to keep the item, or discuss a return.</p></div><div className="message ai-message"><div className="message-meta"><span className="avatar ai">✧</span><strong>Middle AI</strong><Badge>Proposal ready</Badge></div><p>A partial refund is available for review. No agreement takes effect until the terms are accepted.</p><button className="text-button" onClick={() => go('resolution')}>Review proposed terms ↗</button></div></> : <div className="message ai-message"><div className="message-meta"><span className="avatar ai">✧</span><strong>Your private AI assistant</strong></div><p>You can ask for clarification or help drafting a response. Consider whether keeping the item with a partial refund addresses your concern, or whether you’d prefer to discuss a return.</p></div>}{messages.filter(message => message.channel === channel && message.order === order.id).map((message, index) => <div className={`message ${message.ai ? 'ai-message' : ''}`} key={index}><div className="message-meta"><span className="avatar">{message.ai ? '✧' : role === 'Buyer' ? 'AM' : 'AS'}</span><strong>{message.ai ? 'Private AI assistant' : 'You'}</strong><small>{message.ai ? 'Private' : channel === 'Shared conversation' ? 'Shared' : 'Private'}</small></div><p>{message.text}</p></div>)}</div><form className="composer" onSubmit={event => { event.preventDefault(); if (!draft.trim()) return; const newMessages = [{ channel, order: order.id, text: draft.trim() }]; if (channel === 'Private AI assistance') newMessages.push({ channel, order: order.id, ai: true, text: 'You could ask the other party to confirm the refund amount, timing, and whether a return is required.' }); setMessages(items => [...items, ...newMessages]); setDraft(''); }}><textarea aria-label="Message" rows={2} placeholder={channel === 'Shared conversation' ? 'Write a message to everyone in this case…' : 'Ask your private assistant…'} value={draft} onChange={event => setDraft(event.target.value)} /><div><small>{channel === 'Shared conversation' ? 'Shared with both parties' : 'Private · only you can see this'}</small><button className="button primary" disabled={!draft.trim()}>Send ↑</button></div></form></Card><div className="case-sidebar"><Card><div className="card-heading"><h2>Case at a glance</h2><span>◎</span></div><dl><div><dt>Purchase</dt><dd>{order.name}</dd></div><div><dt>Issue</dt><dd>{order.id === '1042' ? 'Item not as described' : issue}</dd></div><div><dt>Requested</dt><dd>{desired}</dd></div></dl></Card><Card className="proposal-card"><div className="eyebrow">PROPOSED RESOLUTION</div><h2>$60.00</h2><p>Partial refund · Keep the item</p><button className="button primary full" onClick={() => go('resolution')}>Review proposal ↗</button><small>Awaiting {role.toLowerCase()} review</small></Card><div className="helper-note"><span>✧</span><p>AI summaries can miss details. Check the original evidence and terms before deciding.</p></div></div></div></>}
    {page === 'resolution' && <><button className="back-link" onClick={() => go('mediation')}>← Back to mediation</button><div className="two-column detail-grid"><Card><div className="card-heading"><h2>Partial refund agreement</h2><Badge>{accepted ? 'Accepted' : 'Pending review'}</Badge></div><div className="refund-amount">$60.00<span>Proposed refund to the buyer</span></div><div className="terms"><h3>What you’re agreeing to</h3><div><span>01</span><p>The seller provides a $60.00 partial refund for order #{order.id}.</p></div><div><span>02</span><p>The buyer keeps the item. No return is required.</p></div><div><span>03</span><p>The seller initiates the refund within 3 business days after both parties accept.</p></div><div><span>04</span><p>The case closes after the buyer confirms receipt of the refund.</p></div></div>{accepted ? <button className="button primary" onClick={() => go('outcome')}>Track case outcome ↗</button> : <><label className="checkbox-label"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />I have reviewed the terms and agree to this resolution.</label><div className="button-row"><button className="button primary" disabled={!reviewed} onClick={() => { setAccepted(true); go('outcome');  }}>Accept agreement</button><button className="button secondary" onClick={() => { setChannel('Shared conversation'); go('mediation'); setDraft('I’d like to discuss a change to the proposed terms: '); }}>Request a change</button></div></>}</Card><div>{purchaseSummary()}<div className="helper-note"><span>✧</span><p>You remain in control. You can return to the conversation to ask questions or propose different terms.</p></div></div></div></>}
    {page === 'outcome' && <><div className="two-column"><Card><div className="card-heading"><h2>{order.name}</h2><Badge>{accepted ? 'Follow-up pending' : 'Awaiting agreement'}</Badge></div><p className="muted">Case #M-{order.id} · Partial refund</p><div className="refund-amount">$60.00<span>{accepted ? 'Agreed refund amount' : 'Proposed refund amount'}</span></div><div className="timeline"><div><i /><strong>{accepted ? `${role} accepted the terms` : 'Proposal awaiting your review'}</strong><p>{accepted ? 'The other party still needs to confirm acceptance.' : 'Review the proposed agreement before proceeding.'}</p></div><div className="pending"><i /><strong>Seller initiates refund</strong><p>Due within 3 business days of mutual acceptance.</p></div><div className="pending"><i /><strong>Buyer confirms receipt</strong><p>The case can then be marked resolved.</p></div></div><button className="button primary" onClick={() => go(accepted ? 'mediation' : 'resolution')}>{accepted ? 'Return to case' : 'Review agreement'} ↗</button></Card><Card><div className="card-heading"><h2>Resolved case</h2><Badge>Resolved</Badge></div><div className="product featured"><ProductThumbnail imageUrl={orders.find(item => item.id === '1034')?.imageUrl} /><div><strong>Everyday backpack</strong><small>Case #M-1034 · Carry Goods</small></div></div><h3>Replacement received</h3><p>The seller sent a replacement for the damaged item. The buyer confirmed delivery and the case was closed.</p><dl><div><dt>Agreement</dt><dd>Replacement at no cost</dd></div><div><dt>Closed</dt><dd>Oct 28, 2026</dd></div><div><dt>Follow-up</dt><dd>No action needed</dd></div></dl></Card></div></>}
    </>}</div></main><dialog ref={settingsDialogRef} tabIndex={-1} className="settings-dialog" aria-label="Settings" onCancel={() => setSettingsOpen(false)} onClose={() => setSettingsOpen(false)} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setSettingsOpen(false); } }}><button className="settings-close" aria-label="Close settings" onClick={() => setSettingsOpen(false)}>×</button>{settingsNotice && <div className="notice settings-notice" role="status">{settingsNotice}<button aria-label="Dismiss notification" onClick={() => setSettingsNotice('')}>×</button></div>}<Settings isOpen={settingsOpen} notify={setSettingsNotice} orders={orders} onPurchase={item => { setSettingsOpen(false); open(item); }} /></dialog></div>;
}
createRoot(document.getElementById('root')).render(<App />);
