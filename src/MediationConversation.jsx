import EvidenceUpload from './EvidenceUpload';
import { evidenceUploadBody } from './lib/live';
import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { date } from './lib/format';

export default function MediationConversation({ api, disputeId, admin }) {
  const [view, setView] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [draft, setDraft] = useState('');
  const pending = useRef(null);
  const [justification, setJustification] = useState('');
  const [problemType, setProblemType] = useState('SHIPPING_ERROR');
  useEffect(() => {
    const controller = new AbortController();
    const load = () => api.mediation(disputeId, controller.signal).then(setView).catch(failure => { if (failure.name !== 'AbortError') setError(failure.message); });
    load(); const timer = setInterval(load, 15000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [api, disputeId]);
  const perform = async (key, callback) => {
    if (busy) return;
    const request = pending.current?.key === key ? pending.current : { key, id: crypto.randomUUID() };
    pending.current = request; setBusy(true); setError('');
    try { setView(await callback(request.id)); pending.current = null; return true; }
    catch (failure) { setError(failure.message); return false; }
    finally { setBusy(false); }
  };
  const action = (action, extra = {}) => perform(JSON.stringify({ action, ...extra }), idempotencyKey => api.mediationAction(disputeId, { action, ...extra, idempotencyKey }));
  const current = view?.case;
  return <section className="card mediation-conversation" aria-label="PayPal mediation conversation">
    <div className="card-heading"><h2>Conversation and mediation</h2><button className="button secondary" disabled={!admin || busy} onClick={() => perform('refresh', () => api.refreshMediation(disputeId))}>Sync with PayPal</button></div>
    {view && <p>{view.notice}</p>}
    {error && <p role="alert">{error}</p>}
    {!view && !error && <p role="status">Loading conversation…</p>}
    {current && <><p role="status">{current.state.replaceAll('_', ' ')} · Conciliation deadline: {date(current.conciliationDeadline)}</p>{current.humanReviewReason && <p role="alert">Specialist review required: {current.humanReviewReason}</p>}</>}
    <div className="dispute-chat-log" role="log" aria-label="Messages synchronized with PayPal" aria-live="polite">
      {view?.messages.map(message => <div className={`dispute-chat-message ${message.author === 'SELLER' ? 'from-merchant' : 'from-buyer'}`} key={message.id}><div className="dispute-chat-message-content"><div className="dispute-chat-author">{message.author === 'AGENT' ? 'ResolveAI · on behalf of seller' : message.author}</div><div className="dispute-chat-bubble"><p>{message.text}</p></div><time className="dispute-chat-time" dateTime={message.createdAt}>{date(message.createdAt)} · {message.status}</time></div></div>)}
      {view && !view.messages.length && <p>No synchronized messages yet.</p>}
    </div>
    {admin && <form className="dispute-chat-composer" onSubmit={async event => { event.preventDefault(); if (!draft.trim()) return; if (await perform(`message:${draft}`, idempotencyKey => api.sendMediationMessage(disputeId, { text: draft.trim(), idempotencyKey }))) setDraft(''); }}><label htmlFor={`mediation-message-${disputeId}`}>Message the buyer through PayPal</label><textarea id={`mediation-message-${disputeId}`} maxLength={1500} value={draft} disabled={busy} onChange={event => setDraft(event.target.value)} required rows={3} /><div className="button-row"><button className="button primary" disabled={busy || !draft.trim() || current?.state === 'cerrado'}><Icon name="ArrowUp" />Send to PayPal</button></div><small>Delivery is confirmed only when PayPal acknowledges it. The buyer replies in their PayPal dispute.</small></form>}
    {admin && view && !current && <div className="button-row"><label>Problem type<select value={problemType} onChange={event => setProblemType(event.target.value)}><option value="SHIPPING_ERROR">Shipping problem</option><option value="DEFECTIVE_OR_NOT_AS_DESCRIBED">Defective or different item</option><option value="REFUND_REQUEST">Refund request</option></select></label><button className="button secondary" disabled={busy || !view.policy?.enabled} onClick={() => perform('start', idempotencyKey => api.startMediation(disputeId, { idempotencyKey, origin: 'manual', confirmed: true, type: problemType }))}>Report a problem / start mediation</button>{!view.policy?.enabled && <p>Configure mediation in Merchant settings → Mediation.</p>}</div>}
    {admin && current && !current.humanReviewReason && <div className="button-row">
      {current.state === 'detectado' && current.detection && <button className="button primary" disabled={busy} onClick={() => action('CONFIRM_DETECTION')}>Confirm complaint</button>}
      {current.state === 'en_conciliacion' && <>
        {current.proposal?.result.options.map((option, index) => <button key={index} className="button secondary" disabled={busy || current.sellerAccepted === index} onClick={() => action('ACCEPT', { proposalId: current.proposal.id, option: index })}>{current.sellerAccepted === index ? 'Confirmed: ' : 'Accept: '}{option.description}</button>)}
        <button className="button secondary" disabled={busy} onClick={() => action('REJECT')}>Reject proposal</button>
      </>}
      {current.state === 'sin_acuerdo' && <button className="button primary" disabled={busy || Date.parse(current.claimDeadline) <= Date.now()} onClick={() => action('CLAIM')}>File a claim</button>}
      {current.state === 'recopilando_pruebas' && <p>Both parties may provide evidence until {date(current.evidenceDeadline)}. Evaluation follows automatically.</p>}
      {current.state === 'dictaminado' && <><p>{current.verdict?.summary}</p><button className="button primary" disabled={busy} onClick={() => action('SUBMIT')}>Submit verified dossier to PayPal</button></>}
    </div>}
    {admin && current?.state === 'recopilando_pruebas' && <EvidenceUpload category="Case evidence" readOnly={busy || Date.parse(current.evidenceDeadline) <= Date.now()} accept="application/pdf,image/png,image/jpeg" onUpload={async file => { const body = await evidenceUploadBody(file); const ok = await perform(`evidence:${body.externalReference}`, idempotencyKey => api.uploadMediationEvidence(disputeId, { idempotencyKey, file: body })); if (!ok) throw new Error('Evidence upload was not completed.'); }} />}
    {admin && current?.humanReviewReason && <form onSubmit={event => event.preventDefault()}><label>Specialist review justification<textarea minLength={20} maxLength={1500} required value={justification} onChange={event => setJustification(event.target.value)} /></label><div className="button-row"><button type="button" className="button secondary" disabled={busy || justification.trim().length < 20} onClick={() => action('REVIEW', { decision: 'RESUME', justification: justification.trim() })}>Resume after review</button><button type="button" className="button secondary" disabled={busy || justification.trim().length < 20} onClick={() => action('REVIEW', { decision: 'CLOSE', justification: justification.trim() })}>Close after review</button></div><small>Uncertain PayPal deliveries must be reconciled before resuming.</small></form>}
    {current && <details><summary>Case timeline</summary><ol>{current.transitions.map((step, i) => <li key={i}>{date(step.at)} · {step.agent} · {step.to} · {step.reason}</li>)}</ol></details>}
  </section>;
}
