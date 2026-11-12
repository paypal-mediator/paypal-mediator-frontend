import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { createApi } from './lib/api';
import { bootstrapWorkspace } from './lib/workspace-bootstrap';
import WorkspaceLoading from './WorkspaceLoading';
let connectedModule;
function loadConnectedComponent() {
  if (!connectedModule) connectedModule = import('./ConnectedApp').catch(error => { connectedModule = undefined; throw error; });
  return connectedModule;
}
const apiUrl = import.meta.env.VITE_API_URL || 'https://resolve-ai-api-ybmj.onrender.com/api';
let authClient;
function auth() {
  if (!authClient) authClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  return authClient;
}
function SignedOut({ client, initialError = '' }) {
  const [mode, setMode] = useState('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState('');
  const signingUp = mode === 'signup';
  const switchMode = next => { setMode(next); setError(''); setNotice(''); };
  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    try {
      if (signingUp) {
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) setNotice('Account created. Check your email to confirm it, then sign in.');
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return <div className="signed-out"><section className="card"><h1>{signingUp ? 'Create account' : 'Sign in'}</h1><p>{signingUp ? 'Start your merchant workspace.' : 'Open your merchant workspace.'}</p><form key={mode} className="account-settings-form account-information-form" onSubmit={submit}><label>Email address<input type="email" name="email" autoComplete="username" required /></label><label>Password<input type="password" name="password" autoComplete={signingUp ? 'new-password' : 'current-password'} required /></label>{error && <p role="alert">{error}</p>}{notice && <p className="auth-notice" role="status">{notice}</p>}<button className="button primary" disabled={busy}>{busy ? (signingUp ? 'Creating account…' : 'Signing in…') : (signingUp ? 'Create account' : 'Sign in')}</button></form><button className="auth-switch" type="button" onClick={() => switchMode(signingUp ? 'signin' : 'signup')}>{signingUp ? 'Already have an account? Sign in' : 'Don’t have an account? Create one'}</button></section></div>;
}
export default function LiveRoot() {
  const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const [session, setSession] = useState(undefined);
  const [error, setError] = useState('');
  const [workspace, setWorkspace] = useState(null);
  const [startupError, setStartupError] = useState(null);
  const [startupAttempt, setStartupAttempt] = useState(0);
  useEffect(() => {
    if (!configured) return;
    let mounted = true;
    const { data } = auth().auth.onAuthStateChange((_event, value) => { if (mounted) { setSession(value); setError(''); } });
    auth().auth.getSession().then(({ data, error }) => { if (mounted) { if (error) setError(error.message); setSession(data.session); } }).catch(error => { if (mounted) { setError(error.message); setSession(null); } });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, [configured]);
  const api = useMemo(() => createApi({ baseUrl: apiUrl, getAccessToken: async () => {
    const { data, error } = await auth().auth.getSession();
    if (error) throw error;
    return data.session?.access_token;
  } }), []);
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) { setWorkspace(null); return; }
    const controller = new AbortController();
    let mounted = true;
    setStartupError(null);
    bootstrapWorkspace({ api, userId, location: window.location, storage: { getItem: key => window.localStorage.getItem(key) }, signal: controller.signal, loadComponent: loadConnectedComponent }).then(value => {
      if (mounted) setWorkspace(value);
    }).catch(error => { if (mounted) setStartupError({ userId, error }); });
    return () => { mounted = false; controller.abort(); };
  }, [api, userId, startupAttempt]);
  if (!configured) return <div className="signed-out"><section className="card"><h1>Connection setup</h1><p>Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart the frontend.</p></section></div>;
  if (session === undefined) return <WorkspaceLoading />;
  if (!session) return <SignedOut client={auth()} initialError={error} />;
  if (startupError?.userId === userId) return <div className="signed-out"><section className="card remote-state" role="alert"><p>{startupError.error.message}</p>{startupError.error.requestId && <small>Request ID: {startupError.error.requestId}</small>}<button className="button secondary" onClick={() => { setStartupError(null); setStartupAttempt(value => value + 1); }}>Try again</button><button className="button secondary" onClick={() => auth().auth.signOut()}>Sign out</button></section></div>;
  if (workspace?.userId !== userId) return <WorkspaceLoading />;
  const ConnectedApp = workspace.Component;
  return <ConnectedApp key={userId} api={api} auth={auth()} session={session} initialTeams={workspace.teams} initialSelectedTeamId={workspace.selectedTeamId} initialTeamApi={workspace.teamApi} initialTeamApis={workspace.teamApis} />;
}
