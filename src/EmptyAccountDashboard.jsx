import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import ProfileAvatar from './ProfileAvatar';
import LiveSettings from './LiveSettings';

export default function EmptyAccountDashboard({ api, auth, session, onCreateTeam, onJoinTeam }) {
  const [error, setError] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarClosed, setSidebarClosed] = useState(false);
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
  return <div className={`app-shell empty-account-shell ${sidebarClosed ? 'sidebar-collapsed' : ''}`}>
    <button type="button" className="sidebar-toggle" aria-label={sidebarClosed ? 'Open sidebar' : 'Close sidebar'} aria-controls="empty-account-sidebar" aria-expanded={!sidebarClosed} onClick={() => setSidebarClosed(value => !value)}><Icon name={sidebarClosed ? 'PanelLeftOpen' : 'PanelLeftClose'} size={18} /></button>
    <aside id="empty-account-sidebar" className="sidebar" hidden={sidebarClosed}><nav className="team-sidebar" aria-label="Teams"><div className="team-heading-row"><button type="button" className="team-folder new-team-option" onClick={onCreateTeam}><Icon name="Plus" className="sidebar-icon" /><span>New team</span></button></div></nav></aside>
    <main>
      <header className="topbar"><nav className="breadcrumb" aria-label="Breadcrumb"><ol><li><span className="breadcrumb-current" aria-current="page">Overview</span></li></ol></nav><div className="topbar-right"><div className="account-dropdown" ref={dropdown}><button className="account-profile" aria-label="Account menu" aria-expanded={accountOpen} onClick={() => setAccountOpen(value => !value)}><ProfileAvatar small /></button>{accountOpen && <div className="account-menu"><button onClick={() => { setAccountOpen(false); setSettingsOpen(true); }}><Icon name="Settings" />Account settings</button><button onClick={signOut}><Icon name="LogOut" />Log out</button></div>}</div></div></header>
      <div className="workspace empty-account-workspace">{error && <p role="alert">{error}</p>}<section className="empty-account-state" aria-labelledby="empty-account-title"><div className="empty-account-icon"><Icon name="Users" size={28} /></div><h1 id="empty-account-title">No teams yet</h1><p>Create a team to start your workspace, or join a team you’ve been invited to.</p><div className="button-row"><button className="button primary" onClick={onCreateTeam}><Icon name="Plus" />Create team</button><button className="button secondary" onClick={onJoinTeam}><Icon name="Users" />Join a team</button></div></section></div>
    </main>
    {settingsOpen && <LiveSettings api={api} auth={auth} user={session.user} scope="account" onClose={() => setSettingsOpen(false)} />}
  </div>;
}
