import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import RemoteState from './RemoteState';
import { useRemote } from './lib/useRemote';
import { label } from './lib/format';

function Invitations({ api, onAccept, busy }) {
  const invitations = useRemote(signal => api.merchantInvitations(signal), [api]);
  return <RemoteState resource={invitations}>{data => data.items.length ? <div className="team-invitation-list">{data.items.map(invitation => <div className="settings-info-row" key={invitation.id}><span><strong>{invitation.displayName}</strong><small>{label(invitation.role)} invitation</small></span><button className="button primary" disabled={busy} onClick={() => onAccept(invitation.id)}>Join team</button></div>)}</div> : <div className="settings-action-panel"><h3>No invitations yet</h3><p>Ask a team admin to invite your account’s email address, then check again.</p><button className="button secondary" onClick={invitations.reload}>Check invitations</button></div>}</RemoteState>;
}
export default function TeamAccessDialog({ mode, api, onClose, onComplete }) {
  const dialog = useRef(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const previous = document.activeElement; dialog.current.showModal(); return () => previous?.focus(); }, []);
  async function perform(action) {
    setError(''); setBusy(true);
    try { const result = await action(); onComplete(result); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <dialog className="rename-team-dialog team-access-dialog" ref={dialog} aria-label={mode === 'create' ? 'Create team' : 'Join a team'} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}><button className="settings-close" aria-label="Close team dialog" disabled={busy} onClick={onClose}><Icon name="X" /></button><h2>{mode === 'create' ? 'Create team' : 'Join a team'}</h2>{mode === 'create' ? <form className="account-settings-form" onSubmit={event => { event.preventDefault(); perform(() => api.createMerchant({ displayName: name.trim() })); }}><label>Team name<input autoFocus required minLength={1} maxLength={120} value={name} onChange={event => setName(event.target.value)} autoComplete="organization" /></label><div className="button-row"><button className="button primary" disabled={busy || !name.trim()}>{busy ? 'Creating…' : 'Create team'}</button><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancel</button></div></form> : <Invitations api={api} busy={busy} onAccept={id => perform(() => api.acceptMerchantInvitation(id))} />}{error && <p role="alert">{error}</p>}</dialog>;
}
