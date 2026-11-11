import React, { useState } from 'react';
import Icon from './Icon';
import SidebarIcon from './SidebarIcon';

export default function EmptyAccountDashboard({ auth, session, onRefresh }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    setError('');
    try {
      const { error } = await auth.auth.signOut();
      if (error) throw error;
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <nav className="team-sidebar" aria-label="Teams">
          <div className="workspace-label">Teams</div>
          <p className="muted">No teams yet</p>
        </nav>
      </aside>
      <main>
        <header className="topbar">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ol><li><span className="breadcrumb-current" aria-current="page">Overview</span></li></ol>
          </nav>
          <div className="topbar-right">
            <span className="muted">{session.user.email}</span>
            <button className="button secondary" disabled={busy} onClick={signOut}>
              <Icon name="LogOut" /> Log out
            </button>
          </div>
        </header>
        <div className="workspace">
          {error && <p role="alert">{error}</p>}
          <div className="page-heading"><h1>Overview</h1></div>
          <section className="card empty-state">
            <SidebarIcon name="folder" />
            <h2>No teams yet</h2>
            <p>You haven’t joined a team. Transactions, disputes, and activity will appear here once you belong to one.</p>
            <button className="button secondary" onClick={onRefresh}>Refresh teams</button>
          </section>
        </div>
      </main>
    </div>
  );
}
