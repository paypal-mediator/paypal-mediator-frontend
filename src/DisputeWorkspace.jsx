import React, { useMemo, useState } from 'react';
import Badge from './Badge';
import { date, label, money } from './lib/format';

// Dispute UI fixtures only. M05–M09 are not implemented by the backend.
const activityEvents = [
  { id: 'ACT-204', category: 'Investigation', title: 'Payment record collected', detail: 'A payment record is available in the evidence dossier.', time: '2026-11-06T10:00:00Z', status: 'Completed' },
  { id: 'ACT-203', category: 'Verification', title: 'Delivery evidence needs review', detail: 'The available delivery record has not been independently verified.', time: '2026-11-06T09:45:00Z', status: 'Needs review' },
  { id: 'ACT-202', category: 'Review', title: 'Merchant response awaiting review', detail: 'Response preparation and submission are not available yet.', time: '2026-11-06T09:30:00Z', status: 'Not submitted' },
];
const Card = ({ children, className = '' }) => <section className={`card ${className}`}>{children}</section>;

function ActivityList({ events = activityEvents }) {
  return <div className="dispute-activity-list">{events.map(event => <div className="dispute-activity-item" key={event.id}>
    <span className="dispute-activity-mark" aria-hidden="true">·</span>
    <div><strong>{event.title}</strong><p>{event.detail}</p><small>{event.id} · {date(event.time)}</small></div>
    <Badge>{event.status}</Badge>
  </div>)}</div>;
}

export default function DisputeWorkspace({ page, transaction, onTransaction, onEvidence }) {
  const [detail, setDetail] = useState(false);
  const [filter, setFilter] = useState('All activity');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState(() => transaction.readiness.checks.filter(item => item.status === 'PRESENT').map(item => item.code));
  const [files, setFiles] = useState([]);

  const checks = transaction.readiness.checks;
  const presentCount = checks.filter(item => item.status === 'PRESENT').length;
  const needsReview = checks.some(item => item.status === 'CONFLICT');
  const ready = transaction.readiness.status === 'READY' && !needsReview;
  const filteredEvents = useMemo(() => activityEvents.filter(event => filter === 'All activity' || event.category === filter), [filter]);
  const visibleEvidence = checks.filter(item => `${label(item.code)} ${label(item.status)}`.toLowerCase().includes(query.trim().toLowerCase()));

  if (page === 'activity') return <Card>
    <div className="filters"><div className="tabs" aria-label="Activity filters">{['All activity', 'Investigation', 'Verification', 'Review'].map(value => <button type="button" key={value} className={filter === value ? 'selected' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div><span className="muted">Sample activity · {filteredEvents.length} events</span></div>
    <ActivityList events={filteredEvents} />
  </Card>;

  if (!detail) return <>
    <div className="disputes-context-note"><span>Demo workspace</span><p>Dispute records below are frontend examples. Live PayPal disputes are not connected yet.</p></div>
    <div className="stats-grid">
      {[['Open cases', '1', 'Illustrative case'], ['Needs review', needsReview ? '1' : '0', 'Evidence verification'], ['Evidence records', String(presentCount), 'Available in the dossier'], ['Submitted', '0', 'Submission API pending']].map(([name, value, note]) => <Card key={name}><div className="stat-label">{name}</div><div className="stat-value">{value}</div><small>{note}</small></Card>)}
    </div>
    <Card>
      <div className="card-heading"><div><h2>Dispute cases</h2><p className="disputes-card-subtitle">Cases requiring merchant attention</p></div><Badge>Demo data</Badge></div>
      <div className="dispute-entry dispute-entry-complete">
        <div className="dispute-entry-main"><div className="dispute-entry-top"><Badge>Needs review</Badge><span className="dispute-case-reference">DEMO-{transaction.paypalCaptureId.replace(/\D/g, '')}</span></div><h3>Item not received</h3><p>Buyer report · Sample dispute scenario</p><small>{money(transaction.amount)} · Capture {transaction.paypalCaptureId}</small></div>
        <button type="button" className="button primary" onClick={() => setDetail(true)}>Review case <span aria-hidden="true">↗</span></button>
      </div>
    </Card>
    <div className="two-column disputes-lower-grid">
      <Card><div className="card-heading"><h2>Defense readiness</h2><button type="button" className="text-button" onClick={onEvidence}>Open evidence ↗</button></div><div className="dispute-readiness-meter"><div><strong>{presentCount} of {checks.length}</strong><span>evidence checks present</span></div><div className="readiness-track"><span style={{ width: `${(presentCount / Math.max(checks.length, 1)) * 100}%` }} /></div></div><p className="muted">Document coverage is an evidence checklist, not a PayPal Seller Protection decision or a prediction of dispute outcome.</p></Card>
      <Card><div className="card-heading"><h2>Next step</h2><Badge>Merchant review</Badge></div><p>Review the source records, confirm their accuracy, and prepare a response when the dispute workflow API becomes available.</p><button type="button" className="button secondary" onClick={() => setDetail(true)}>Open defense workspace</button></Card>
    </div>
  </>;

  return <>
    <button type="button" className="back-link" onClick={() => setDetail(false)}>← All disputes</button>
    <div className="case-bar"><div><strong>DEMO-{transaction.paypalCaptureId.replace(/\D/g, '')}</strong><span className="muted">Item not received</span></div><Badge>Needs review</Badge></div>
    <div className="dispute-workspace-grid">
      <div className="dispute-stack">
        <Card>
          <div className="card-heading"><h2>Buyer report</h2><Badge>Sample report</Badge></div>
          <p className="dispute-report-copy">“The order has not arrived. Please provide an update on the delivery.”</p>
          <dl><div><dt>Payment capture</dt><dd>{transaction.paypalCaptureId}</dd></div><div><dt>Disputed amount</dt><dd>{money(transaction.amount)}</dd></div><div><dt>Payment date</dt><dd>{date(transaction.capturedAt)}</dd></div><div><dt>Case source</dt><dd>Frontend fixture</dd></div></dl>
          <button type="button" className="text-button" onClick={onTransaction}>View transaction details ↗</button>
        </Card>
        <Card>
          <div className="card-heading"><div><h2>Merchant response</h2><p className="disputes-card-subtitle">Draft locally for review</p></div><Badge>Not submitted</Badge></div>
          <label className="response-label" htmlFor="merchant-dispute-response">Response statement<textarea id="merchant-dispute-response" rows={6} value={response} onChange={event => setResponse(event.target.value)} placeholder="Summarize the facts and explain how the attached records support your response…" /></label>
          <div className="dispute-local-note">This draft stays in this browser session. It is not saved to the backend or sent to PayPal.</div>
          <div className="dispute-action-row"><button type="button" className="button secondary" disabled title="Response preparation API is pending">Prepare response</button><button type="button" className="button primary" disabled title="Submission API is pending">Approve &amp; submit</button></div>
          <small className="dispute-disabled-caption">Response preparation, approval, and submission will be enabled when M05–M09 are implemented.</small>
        </Card>
      </div>
      <div className="dispute-stack">
        <Card>
          <div className="card-heading"><h2>Defense checklist</h2><Badge>{ready ? 'Ready for review' : 'Needs review'}</Badge></div>
          <p className="muted">Based on the transaction evidence dossier.</p>
          <div className="dispute-checklist">{checks.map(check => <div className="dispute-check-row" key={check.code}><span className={`dispute-check-icon ${check.status === 'PRESENT' ? 'is-present' : check.status === 'CONFLICT' ? 'is-conflict' : ''}`} aria-hidden="true">{check.status === 'PRESENT' ? '✓' : check.status === 'CONFLICT' ? '!' : '–'}</span><span>{label(check.code)}</span><Badge>{label(check.status)}</Badge></div>)}</div>
          <div className="card-bottom"><button type="button" className="button secondary full" onClick={onEvidence}>Review evidence dossier ↗</button></div>
        </Card>
        <Card>
          <div className="card-heading"><h2>Evidence picker</h2><Badge>Local selection</Badge></div>
          <p className="muted">Choose records to include in a future response. Selection does not upload or submit evidence.</p>
          <input className="dispute-evidence-search" type="search" aria-label="Filter evidence types" placeholder="Filter evidence types" value={query} onChange={event => setQuery(event.target.value)} /><div className="dispute-evidence-options">{visibleEvidence.map(check => <label className="dispute-evidence-option" key={check.code}><input type="checkbox" checked={selectedEvidence.includes(check.code)} disabled={check.status !== 'PRESENT'} onChange={event => setSelectedEvidence(items => event.target.checked ? [...items, check.code] : items.filter(item => item !== check.code))} /><span><strong>{label(check.code)}</strong><small>{label(check.status)}{check.status === 'PRESENT' ? ' · In dossier' : ' · Not selectable'}</small></span></label>)}</div>
          <label className="response-label dispute-file-label">Additional files<input type="file" multiple accept="image/*,.pdf" onChange={event => setFiles(Array.from(event.target.files || []).map(file => file.name))} /></label>
          {files.length > 0 && <ul className="dispute-file-list">{files.map(name => <li key={name}>{name}</li>)}</ul>}
          <small className="dispute-disabled-caption">Files remain local and are not uploaded. Binary evidence upload is not supported by the current API.</small>
        </Card>
        <Card><div className="card-heading"><h2>Case activity</h2><Badge>Sample events</Badge></div><ActivityList events={activityEvents.slice(0, 2)} /></Card>
      </div>
    </div>
  </>;
}
