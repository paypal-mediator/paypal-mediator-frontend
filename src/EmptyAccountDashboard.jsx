import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import ProfileAvatar from './ProfileAvatar';
import LiveSettings from './LiveSettings';

export default function EmptyAccountDashboard({ api, auth, session, teams = [], onSelectTeam, onCreateTeam, onJoinTeam }) {
  const [error, setError] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdown = useRef(null);
  useEffect(() => {
    const close = event => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'keydown' || !dropdown.current?.contains(event.target)) setAccountOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, []);
  async function signOut() {
    setAccountOpen(false); setError('');
    try { const { error } = await auth.auth.signOut(); if (error) throw error; }
    catch (failure) { setError(failure.message); }
  }
  return <div className="app-shell empty-account-shell">
    <main>
      <header className="topbar"><nav className="breadcrumb" aria-label="Breadcrumb"><ol><li><span className="breadcrumb-current" aria-current="page">Overview</span></li></ol></nav><div className="topbar-right"><div className="account-dropdown" ref={dropdown}><button className="account-profile" aria-label="Account menu" aria-expanded={accountOpen} onClick={() => setAccountOpen(value => !value)}><ProfileAvatar small /></button>{accountOpen && <div className="account-menu"><button onClick={() => { setAccountOpen(false); setSettingsOpen(true); }}><Icon name="Settings" />Account settings</button><button onClick={signOut}><Icon name="LogOut" />Log out</button></div>}</div></div></header>
      <div className="workspace empty-account-workspace">{error && <p role="alert">{error}</p>}<section className="empty-account-state" aria-labelledby="empty-account-title"><div className="empty-account-icon"><Icon name="Users" size={28} /></div><h1 id="empty-account-title">{teams.length ? 'Choose a team' : 'No teams yet'}</h1><p>{teams.length ? 'Open a team to enter its workspace.' : 'Create a team to start your workspace, or join a team you’ve been invited to.'}</p>{teams.length > 0 && <div className="account-team-choices">{teams.map(team => <button className="button secondary" key={team.id} onClick={() => onSelectTeam(team.id)}><Icon name="Folder" />{team.displayName}<Icon name="ChevronRight" /></button>)}</div>}<div className="button-row"><button className="button primary" onClick={onCreateTeam}><Icon name="Plus" />Create team</button><button className="button secondary" onClick={onJoinTeam}><Icon name="Users" />Join a team</button></div></section></div>
    </main>
    {settingsOpen && <LiveSettings api={api} auth={auth} user={session.user} scope="account" onClose={() => setSettingsOpen(false)} />}
  </div>;
}
