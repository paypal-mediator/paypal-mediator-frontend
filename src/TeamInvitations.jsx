import React, { useEffect, useState } from 'react';
import { useRemote } from './lib/useRemote';
import RemoteState from './RemoteState';
import { date, label } from './lib/format';

const deliveryLabels = { NOT_CONFIGURED: 'Email not configured — share the link', PENDING: 'Email queued', PROCESSING: 'Sending email', SENT: 'Accepted by email provider', FAILED: 'Email failed', UNCERTAIN: 'Delivery uncertain — check before resending' };
export function PendingTeamInvitations({ api, onOpen }) {
  const invitations = useRemote(signal => api.merchantInvitations(signal), [api]);
  useEffect(() => { const timer = setInterval(invitations.reload, 30000); return () => clearInterval(timer); }, [invitations.reload]);
  if (!invitations.data?.items.length) return null;
  return <aside className="card team-invitations-notice" aria-label="Pending team invitations"><span>You have {invitations.data.items.length} pending team invitation(s).</span><button className="button secondary" onClick={onOpen}>Review invitations</button></aside>;
}
export function TeamInvitations({ api, admin }) {
  if (!admin) return <div className="settings-action-panel"><h2>Invitations</h2><p>Only team administrators can manage invitations.</p></div>;
  return <ManageInvitations api={api} />;
}
function ManageInvitations({ api }) {
  const resource = useRemote(signal => api.teamInvitations(signal), [api], { store: api.resources, key: 'settings:team-invitations' });
  const [email, setEmail] = useState(''), [role, setRole] = useState('VIEWER'), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  useEffect(() => { const timer = setInterval(resource.reload, 10000); return () => clearInterval(timer); }, [resource.reload]);
  async function perform(action) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); resource.reload(); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <><div className="settings-section-heading"><h2>Invitations</h2><p>Invite someone using their verified account email. Invitations expire after seven days.</p></div><form className="account-settings-form" onSubmit={event => { event.preventDefault(); perform(async () => { await api.createTeamInvitation({ email: email.trim(), role }); setEmail(''); setNotice('Invitation created. Check its email status below, or copy the link.'); }); }}><label>Email address<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label><label>Team role<select value={role} onChange={event => setRole(event.target.value)}><option value="VIEWER">Viewer — read only</option><option value="ADMIN">Admin — manage team and invitations</option></select></label><button className="button primary" disabled={busy}>{busy ? 'Working…' : 'Invite to team'}</button></form>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}<RemoteState resource={resource}>{data => <div className="team-invitation-list">{!data.items.length && <p>No invitations yet.</p>}{data.items.map(invitation => <article className="settings-action-panel" key={invitation.id}><strong>{invitation.email}</strong><p>{label(invitation.role)} · {label(invitation.status)} · Expires {date(invitation.expiresAt)}</p><p>{deliveryLabels[invitation.deliveryStatus]}</p>{invitation.status === 'PENDING' && <div className="button-row"><button className="button secondary" disabled={busy} onClick={() => perform(async () => { await navigator.clipboard.writeText(invitation.shareUrl); setNotice('Invitation link copied. Only the invited email can accept it.'); })}>Copy link</button><button className="button secondary" disabled={busy || ['PROCESSING', 'NOT_CONFIGURED'].includes(invitation.deliveryStatus)} onClick={() => perform(() => api.resendTeamInvitation(invitation.id))}>Resend email</button><button className="button secondary" disabled={busy} onClick={() => perform(() => api.revokeTeamInvitation(invitation.id))}>Revoke</button></div>}</article>)}</div>}</RemoteState></>;
}

export function InvitationLanding({ api, invitationId, user, onExit, onJoined, onSignOut }) {
  const invitation = useRemote(signal => api.merchantInvitation(invitationId, signal), [api, invitationId]);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function respond(accept) {
    setBusy(true); setError('');
    try { const result = await (accept ? api.acceptMerchantInvitation(invitationId) : api.declineMerchantInvitation(invitationId)); if (accept) onJoined(result); else onExit(); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <div className="signed-out"><section className="card"><h1>Team invitation</h1><p>Signed in as {user.email}. Use the invited email to accept.</p><RemoteState resource={invitation}>{data => <><h2>{data.displayName}</h2><p>{label(data.role)} · {label(data.status)} · Expires {date(data.expiresAt)}</p>{data.status === 'PENDING' && <div className="button-row"><button className="button primary" disabled={busy} onClick={() => respond(true)}>Join team</button><button className="button secondary" disabled={busy} onClick={() => respond(false)}>Decline</button></div>}</>}</RemoteState>{error && <p role="alert">{error}</p>}<div className="button-row"><button className="button secondary" disabled={busy} onClick={onExit}>Back to dashboard</button><button className="button secondary" disabled={busy} onClick={onSignOut}>Use another account</button></div></section></div>;
}
