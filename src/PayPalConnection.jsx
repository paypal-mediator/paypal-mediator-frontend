import React, { useState } from 'react';

export function PayPalConnection({ getApi, onConnected, connected = false }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [started, setStarted] = useState(false);
  async function connect() {
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    setBusy(true); setError('');
    try {
      if (!popup) throw new Error('Allow pop-ups to authorize your PayPal account.');
      const api = await getApi();
      const { actionUrl } = await api.connectPayPal();
      const url = new URL(actionUrl);
      if (url.origin !== 'https://www.sandbox.paypal.com') throw new Error('Invalid PayPal authorization URL.');
      popup.location.replace(url.href); setStarted(true);
    } catch (failure) { popup?.close(); setError(failure.message); } finally { setBusy(false); }
  }
  async function check() {
    setBusy(true); setError('');
    try { const api = await getApi(); await api.completePayPal(); const result = await api.integrations(); if (result.paypal.connectionStatus !== 'CONNECTED') throw new Error('PayPal has not confirmed the connection.'); await onConnected?.(); setStarted(false); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <div className="settings-action-panel"><p>Authorize the PayPal Business account for this business in PayPal Sandbox. By continuing, you consent to sharing the business connection reference with PayPal and request access to read and manage its disputes.</p><button type="button" className="button secondary" disabled={busy} onClick={connect}>{busy ? 'Please wait…' : connected ? 'Connect another PayPal account' : 'Connect PayPal'}</button>{started && <><p>Finish authorization in PayPal, then check the connection. Closing PayPal does not connect your account.</p><button type="button" className="button primary" disabled={busy} onClick={check}>Check authorization</button></>}{error && <p role="alert">{error}</p>}</div>;
}

export function PayPalReturn({ api, merchantId }) {
  const [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  return <div className="signed-out"><section className="card"><h1>Verify PayPal connection</h1><p>Confirm the authorization with PayPal. You can also return to the original tab and check authorization there.</p><button className="button primary" disabled={busy} onClick={async () => { setBusy(true); try { await api.forMerchant(merchantId).completePayPal(); setStatus('PayPal connection verified. You can close this tab.'); } catch (error) { setStatus(error.message); } finally { setBusy(false); } }}>Verify connection</button>{status && <p role="status">{status}</p>}<a href="/">Return to workspace</a></section></div>;
}
