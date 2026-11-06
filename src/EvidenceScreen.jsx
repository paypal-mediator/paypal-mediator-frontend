import React, { useEffect, useRef, useState } from 'react';
import Badge from './Badge';
import EvidenceUpload from './EvidenceUpload';
import { date, label } from './lib/format';

export default function EvidenceScreen({ transaction, snapshots }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedRevision, setSelectedRevision] = useState(snapshots[0].revision);
  const historyButton = useRef(null);
  const searchRef = useRef(null);
  const historyButtons = useRef([]);
  const snapshot = snapshots.find(item => item.revision === selectedRevision) || snapshots[0];
  const historical = snapshot.revision !== snapshots[0].revision;
  const close = () => { setHistoryOpen(false); setSelectedRevision(snapshots[0].revision); historyButton.current?.focus(); };
  useEffect(() => {
    if (!historyOpen) return;
    historyButtons.current[snapshots.findIndex(item => item.revision === selectedRevision)]?.focus({ preventScroll: true });
    const escape = event => {
      if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('dialog[open]')) { event.preventDefault(); close(); }
    };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [historyOpen]);
  const select = index => {
    const next = (index + snapshots.length) % snapshots.length;
    setSelectedRevision(snapshots[next].revision);
    historyButtons.current[next]?.focus();
  };
  return <>
    <div className="evidence-toolbar"><div className="search-field evidence-search" onClick={() => searchRef.current?.focus()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg><input ref={searchRef} className="search" type="text" aria-label="Search evidence" placeholder="Search evidence" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); event.currentTarget.blur(); } }} /></div><div className={`history-control ${historyOpen ? 'is-open' : ''}`}><button className={`history-button ${historyOpen ? 'history-button-expanded' : ''}`} ref={historyButton} aria-label="Version history" aria-expanded={historyOpen} onClick={() => { if (!historyOpen) setHistoryOpen(true); }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11a9 9 0 1 1 2.7 7M3 4v7h7M12 7v5l3 2" /></svg><span aria-hidden={!historyOpen}>Version History</span></button>{historyOpen && <button className="history-control-close" aria-label="Close version history" onClick={close}>×</button>}</div></div>
    <div className={`evidence-history-layout ${historyOpen ? 'history-open' : ''}`}>
      <div><div className="evidence-records">{snapshot.checks.filter(check => `${label(check.code)} ${snapshot.items.filter(item => check.evidenceIds.includes(item.id)).map(item => `${item.sourceKind} ${item.sourceSystem}`).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())).map(check => {
        const records = snapshot.items.filter(item => check.evidenceIds.includes(item.id));
        const done = check.status === 'PRESENT' && records.length > 0 && records.every(item => item.integrity === 'VALID');
        return <section className="card evidence-split-card" key={check.code}><div className="evidence-current"><div className="card-heading"><h2>{label(check.code)}</h2><Badge>{done ? 'Done' : 'Needs attention'}</Badge></div>{records.length ? records.map(item => <dl key={item.id}><div><dt>Source</dt><dd>{item.sourceKind}</dd></div><div><dt>System</dt><dd>{item.sourceSystem}</dd></div><div><dt>Retrieved</dt><dd>{date(item.retrievedAt)}</dd></div><div><dt>Integrity</dt><dd>{label(item.integrity)}</dd></div></dl>) : <p className="evidence-missing">Additional evidence needed.</p>}</div><div className="evidence-files"><EvidenceUpload key={`${transaction.id}-${check.code}-${historical ? snapshot.revision : 'current'}`} category={label(check.code)} readOnly={historical} /></div></section>;
      })}</div></div>
      <div className="version-sidebar-track" inert={!historyOpen} aria-hidden={!historyOpen}><aside className="version-sidebar" aria-label="Evidence version history"><div className="version-list" role="listbox" aria-label="Evidence revisions">{snapshots.map((item, index) => <button key={item.revision} ref={element => { historyButtons.current[index] = element; }} role="option" aria-selected={selectedRevision === item.revision} tabIndex={selectedRevision === item.revision ? 0 : -1} className={`version-option ${selectedRevision === item.revision ? 'selected' : ''}`} onClick={() => setSelectedRevision(item.revision)} onKeyDown={event => {
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); select(event.key === 'Home' ? 0 : event.key === 'End' ? snapshots.length - 1 : index + (event.key === 'ArrowDown' ? 1 : -1)); }
      }}><span className="version-dot" /><span><strong>{date(item.createdAt)}</strong><small>Revision {item.revision}{index === 0 ? ' · Current version' : ''}</small><small>{item.summary}</small></span></button>)}</div></aside></div>
    </div>
  </>;
}
