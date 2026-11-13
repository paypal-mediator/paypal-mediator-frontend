import React, { useEffect, useRef, useState } from 'react';
import { date, label } from './lib/format';

export function ConciliationPolicy({ api, admin }) {
  const [policy, setPolicy] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [saved, setSaved] = useState(false);
  useEffect(() => { const controller = new AbortController(); api.conciliationPolicy(controller.signal).then(setPolicy).catch(e => { if (e.name !== 'AbortError') setError(e.message); }); return () => controller.abort(); }, [api]);
  const update = value => { setPolicy(value); setSaved(false); };
  const rule = (index, field, value) => update({ ...policy, rules: policy.rules.map((r, i) => i === index ? { ...r, [field]: value } : r) });
  return <><h2>Preventive conciliations</h2><p>A local bilingual classifier checks buyer messages first. Positive acknowledgements do not open a case or call the response generator. Review is the default.</p>{error && <p role="alert">{error}</p>}{!policy ? <p role="status">Loading policy...</p> : <form className="account-settings-form conciliation-policy" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { setPolicy(await api.saveConciliationPolicy(policy)); setSaved(true); } catch (e) { setError(e.message); } finally { setBusy(false); } }}><fieldset disabled={!admin || busy}>
    <label className="checkbox-label"><input type="checkbox" checked={policy.enabled} onChange={e => update({ ...policy, enabled: e.target.checked })} />Enable reply proposals for questions and complaints</label>
    <p>Without an automatic rule, proposals remain private until you edit and approve them. Low-confidence classifications and formal-dispute mentions require review. A classifier score is not a measured probability.</p>
    {policy.rules.map((r, index) => <section className="settings-action-panel account-settings-form" key={index}><h3>Rule {index + 1}</h3>
      <label>Message type<select value={r.category} onChange={e => rule(index, 'category', e.target.value)}><option value="QUESTION">Information request</option><option value="COMPLAINT">Complaint</option></select></label>
      <label>Case type<select value={r.issue} onChange={e => rule(index, 'issue', e.target.value)}>{['GENERAL', 'SHIPPING', 'DEFECT', 'RETURN'].map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <label>Permitted solutions and conditions<textarea value={r.instructions} maxLength={1500} onChange={e => rule(index, 'instructions', e.target.value)} placeholder="Describe what you permit, what information is required, and what must never be promised." /></label>
      <label className="checkbox-label"><input type="checkbox" checked={r.automatic} onChange={e => rule(index, 'automatic', e.target.checked)} />Send approved text automatically for this exact type of case</label>
      {r.automatic && <><p>Only the exact approved text below can be sent automatically. No refunds, replacements or payments are executed by this setting. Keep promises conditional when facts have not been verified.</p><label>Approved reply in Spanish<textarea required maxLength={1500} value={r.replyEs} onChange={e => rule(index, 'replyEs', e.target.value)} /></label><label>Approved reply in English<textarea required maxLength={1500} value={r.replyEn} onChange={e => rule(index, 'replyEn', e.target.value)} /></label></>}
      <button type="button" className="button secondary" onClick={() => update({ ...policy, rules: policy.rules.filter((_, i) => i !== index) })}>Remove rule</button>
    </section>)}
    <div className="settings-row-actions"><button type="button" className="button secondary" disabled={policy.rules.length >= 8} onClick={() => update({ ...policy, rules: [...policy.rules, { category: 'QUESTION', issue: 'GENERAL', automatic: false, instructions: '', replyEs: '', replyEn: '' }] })}>Add rule</button><button className="button primary" disabled={busy}>{busy ? 'Saving...' : 'Save conciliation policy'}</button></div>
  </fieldset>{saved && <p role="status">Policy saved. Automatic delivery applies only to explicitly enabled rules.</p>}</form>}</>;
}

function DraftReply({ api, chatId, message, onChanged }) {
  const [text, setText] = useState(message.draftText || ''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const request = useRef(null);
  return <form className="account-settings-form settings-action-panel" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); const payload = { messageId: message.id, expectedVersion: message.version, text: text.trim() }; if (!request.current || request.current.text !== payload.text) request.current = { ...payload, idempotencyKey: crypto.randomUUID() }; try { await api.approveConciliation(chatId, request.current); await onChanged(); } catch (e) { setError(e.message); } finally { setBusy(false); } }}>
    <h3>Review before sending</h3>{message.plan && <p>{message.plan}</p>}<p>This draft is private. Check facts and commitments, then edit or approve it.</p>
    <label>Reply to buyer<textarea required maxLength={2000} value={text} onChange={e => setText(e.target.value)} disabled={busy} rows={5} /></label>
    {error && <p role="alert">{error}</p>}<button className="button primary" disabled={busy || !text.trim()}>{busy ? 'Sending...' : 'Approve and send to buyer chat'}</button>
  </form>;
}

export default function Conciliations({ api, admin, initialId }) {
  const [items, setItems] = useState([]), [selected, setSelected] = useState(initialId || null), [view, setView] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [showAll, setShowAll] = useState(false);
  useEffect(() => { setSelected(initialId || null); }, [initialId]);
  const [orders, setOrders] = useState([]), [orderId, setOrderId] = useState(''), [link, setLink] = useState(null);
  useEffect(() => { const controller = new AbortController(); const load = () => api.conciliations(controller.signal).then(v => setItems(v.items)).catch(e => { if (e.name !== 'AbortError') setError(e.message); }); load(); const timer = setInterval(load, 15000); return () => { controller.abort(); clearInterval(timer); }; }, [api]);
  useEffect(() => { if (!admin) return; const controller = new AbortController(); Promise.all([api.contactOrders(controller.signal), api.transactions({page:1,pageSize:100},controller.signal)]).then(([o,t]) => setOrders([...o.items.map(x => ({id:`order:${x.id}`,externalId:`Order ${x.externalId}`,request:{orderId:x.id}})), ...t.items.map(x => ({id:`payment:${x.id}`,externalId:`PayPal ${x.paypalCaptureId}`,request:{transactionId:x.id}}))])).catch(e => { if (e.name !== 'AbortError') setError(e.message); }); return () => controller.abort(); }, [api, admin]);
  useEffect(() => { setView(null); if (!selected) return; const controller = new AbortController(); const load = () => api.conciliation(selected, controller.signal).then(setView).catch(e => { if (e.name !== 'AbortError') setError(e.message); }); load(); const timer = setInterval(load, 10000); return () => { controller.abort(); clearInterval(timer); }; }, [api, selected]);
  const reload = async () => { if (selected) setView(await api.conciliation(selected)); setItems((await api.conciliations()).items); };
  const action = async name => { setBusy(true); setError(''); try { await api[name](selected); await reload(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const chatLog = useRef(null);
  useEffect(() => { if(chatLog.current) chatLog.current.scrollTop = chatLog.current.scrollHeight; }, [view?.messages.length]);
  const latestBuyer = view?.messages.filter(m => m.author === 'BUYER').at(-1);
  return <><section className="card"><h2>Conciliations</h2><p>Resolve questions and complaints before a PayPal dispute. Messages arrive only through the order contact link you share with the buyer.</p>{error && <p role="alert">{error}</p>}
    {admin && <form className="account-settings-form" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { const created = await api.createContactLink({ ...orders.find(o => o.id === orderId).request, expiresInDays: 7 }); setLink({ ...created, url: `${window.location.origin}/contact#${created.token}` }); await reload(); } catch (e) { setError(e.message); } finally { setBusy(false); } }}><label>Order or payment<select required value={orderId} onChange={e => setOrderId(e.target.value)}><option value="">Choose an order or payment</option>{orders.map(o => <option key={o.id} value={o.id}>{o.externalId}</option>)}</select></label><button className="button primary" disabled={busy || !orderId}>Create buyer contact link</button><small>Showing this team's 100 most recent orders and 100 most recent PayPal payments. Links expire after 7 days; share only with the buyer.</small></form>}
    {link && <div className="settings-action-panel"><label>Private buyer link<input readOnly value={link.url} onFocus={e => e.target.select()} /></label><p>Copy this link now. It is not stored in recoverable form. Expires {date(link.expiresAt)}. Anyone with this link can access this order conversation.</p><button className="button secondary" onClick={() => { setLink(null); setSelected(link.id); }}>Open conversation</button></div>}
    <label className="checkbox-label"><input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />Include unused links, positive acknowledgements and resolved cases</label>
    <p className="muted">Most recent 100 conversations. Reading this list never calls the classifier or response generator.</p>
    <div className="settings-row-actions">{items.filter(c => showAll || ['OPEN', 'REVIEW'].includes(c.state)).map(c => <button key={c.id} className="button secondary" onClick={() => setSelected(c.id)}>{c.orderReference} · {label(c.category)} · {label(c.state)}</button>)}</div>
    {!items.some(c => showAll || ['OPEN', 'REVIEW'].includes(c.state)) && <p>No active conciliations.</p>}
  </section>
  {view && <section className="card conciliation-thread"><h2>Order {view.chat.orderReference}</h2><p>{label(view.chat.state)} · {label(view.chat.category)}</p><div ref={chatLog} className="dispute-chat-log" role="log" aria-label="Order conversation">{view.messages.map(m => <article className="settings-action-panel" key={m.id}><strong>{m.author === 'BUYER' ? 'Buyer' : m.author === 'AGENT' ? 'Approved automatic reply' : 'Merchant'}</strong><p className="chat-message-text">{m.text}</p><small>{date(m.createdAt)}</small>{m.classification && <p className="muted">{label(m.classification.category)} · {label(m.classification.issue)} · {m.classification.source === 'FAST_FILTER' ? 'Positive acknowledgement; no generator call' : m.classification.source === 'UNAVAILABLE' ? 'Classifier unavailable; manual review needed' : 'Local NLP classifier'} · {label(m.draftStatus)}</p>}</article>)}</div>
    {admin && latestBuyer?.draftStatus === 'PENDING' && view.chat.state !== 'RESOLVED' && !view.chat.revokedAt && <DraftReply key={`${latestBuyer.id}:${latestBuyer.version}`} api={api} chatId={selected} message={latestBuyer} onChanged={reload} />}
    {latestBuyer?.draftStatus === 'PROCESSING' && <p role="status">Analyzing the buyer message. If processing was interrupted, review this conversation before responding.</p>}
    {admin && <div className="settings-row-actions">{latestBuyer && !['PENDING', 'SENT'].includes(latestBuyer.draftStatus) && <button className="button secondary" disabled={busy || view.chat.state === 'RESOLVED'} onClick={() => action('reviewConciliation')}>Write reply / take over manually</button>}<button className="button secondary" disabled={busy || view.chat.state === 'RESOLVED'} onClick={() => action('closeConciliation')}>Mark resolved</button><button className="button secondary" disabled={busy || Boolean(view.chat.revokedAt)} onClick={() => action('revokeContactLink')}>Revoke buyer link</button></div>}
  </section>}</>;
}

export function RelatedConciliations({ api, orderId, transactionId, onOpen }) {
  const [items, setItems] = useState([]), [error, setError] = useState('');
  useEffect(() => { if (!orderId && !transactionId) return; const controller = new AbortController(); (orderId ? api.conciliationsForOrder(orderId,controller.signal) : api.conciliationsForPayment(transactionId,controller.signal)).then(value => setItems(value.items)).catch(e => { if(e.name !== 'AbortError') setError(e.message); }); return () => controller.abort(); }, [api,orderId,transactionId]);
  if(!orderId && !transactionId) return null;
  return <section className="card"><h2>Prior conciliations</h2>{error && <p role="alert">{error}</p>}{items.length ? items.map(item => <button className="button secondary" key={item.id} onClick={() => onOpen(item.id)}>{item.orderReference} · {label(item.state)}</button>) : <p>No preventive conversations linked to this order.</p>}</section>;
}
