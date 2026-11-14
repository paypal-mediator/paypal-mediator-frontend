import React, { useState } from 'react';
import { useRemote } from './lib/useRemote';
import { date, label } from './lib/format';
import RemoteState from './RemoteState';
import Badge from './Badge';

// The same card is used in the evidence dossier and the linked dispute.
// Reading never initiates a paid provider request; resolving requires ADMIN or MEMBER.
export default function ShipmentTrackingCard({ api, transactionId, admin, canEdit = admin }) {
  const resource = useRemote(signal => api.shipmentTracking(transactionId, signal), [api, transactionId], {
    store: api.resources, key: `shipment-tracking:${transactionId}`,
  });
  const [number, setNumber] = useState(''), [carrier, setCarrier] = useState('');
  const [postalCode, setPostalCode] = useState(''), [origin, setOrigin] = useState(''), [shipDate, setShipDate] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const resolve = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api.resolveShipmentTracking(transactionId, {
        ...(resource.data?.errorCode && !resource.data.nextAttemptAt ? { retryFailed: true } : {}),
        ...(number.trim() ? { trackingNumber: number.trim() } : {}),
        ...(carrier ? { carrierCode: Number(carrier) } : {}),
        ...(postalCode.trim() ? { destinationPostalCode: postalCode.trim() } : {}),
        ...(origin.trim() ? { originCountry: origin.trim().toUpperCase() } : {}),
        ...(shipDate ? { shipDate: shipDate.replaceAll('-', '/') } : {}),
      });
      await resource.reload();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <section className="card shipment-tracking-card">
    <div className="card-heading"><h2>Shipment tracking</h2><button className="text-button" type="button" onClick={() => resource.reload()} disabled={busy}>Reload saved data</button></div>
    {resource.loading ? <p role="status">Loading shipment tracking…</p> : <RemoteState resource={resource}>{data => <>
      <p><Badge>{label(data.state)}</Badge></p>
      {data.selected ? <>
        <dl className="shipment-tracking-details">
          <div><dt>Tracking number</dt><dd>{data.selected.trackingNumber}</dd></div>
          <div><dt>Carrier</dt><dd>{data.selected.carrier || (data.selected.carrierCode ? `Carrier ${data.selected.carrierCode}` : 'Not identified')}</dd></div>
          <div><dt>Status</dt><dd>{label(data.selected.status)}</dd></div>
          <div><dt>Source</dt><dd>{data.selected.source === '17track' ? '17TRACK' : data.selected.source === 'paypal' ? 'PayPal' : 'ERP'}{data.selected.containsDemo ? ' · DEMO' : ''}</dd></div>
          <div><dt>Last update</dt><dd>{data.selected.updatedAt ? date(data.selected.updatedAt) : 'Not provided'}</dd></div>
          {data.selected.deliveryReported && <div><dt>Reported delivery</dt><dd>{data.selected.deliveredAt ? date(data.selected.deliveredAt) : 'Delivery time not provided'}</dd></div>}
        </dl>
        {data.selected.deliveryReported && <p className="muted">The provider reports delivery. This tracking report does not include documentary proof of delivery or determine the dispute outcome.</p>}
        <ol className="shipment-tracking-events">{data.selected.events.map((event, index) => <li key={`${event.occurredAt}:${index}`}><time dateTime={event.occurredAt}>{date(event.occurredAt)}</time><strong>{label(event.status)}</strong><span>{event.description}</span>{event.location && <small>{event.location}</small>}</li>)}</ol>
      </> : <p className="muted">{data.state === 'NO_TRACKING_NUMBER' ? 'No tracking number is available for this transaction.' : 'No shipment tracking has been saved yet.'}</p>}
      {!!data.discrepancies.length && <div role="alert"><strong>Tracking requires review</strong>{data.discrepancies.map(issue => <p key={issue}>{label(issue)}</p>)}</div>}
      {data.errorCode && <p role="status">{label(data.errorCode)}</p>}
      {data.lastAttemptAt && <small>Last sync attempt: {date(data.lastAttemptAt)}</small>}
      {data.nextAttemptAt && <small>Next eligible sync: {date(data.nextAttemptAt)}</small>}
      {data.observations.length > 1 && <details><summary>Reports from all sources</summary>{data.observations.map((item, index) => <p key={`${item.sourceSystem}:${item.trackingNumber}:${index}`}>{item.source === '17track' ? '17TRACK' : item.sourceSystem} · {item.trackingNumber} · {label(item.status)} · {item.updatedAt ? date(item.updatedAt) : 'No update date'}</p>)}</details>}
    </>}</RemoteState>}
    {error && <p role="alert">{error}</p>}
    {canEdit && <form onSubmit={resolve} className="shipment-tracking-form">
      <label>Tracking number (optional)<input value={number} onChange={event => setNumber(event.target.value)} maxLength={100} pattern="[A-Za-z0-9][A-Za-z0-9_-]{4,99}" placeholder="Use the saved or linked tracking number" /></label>
      <label>17TRACK carrier code (optional)<input type="number" min="1" max="2147483647" step="1" value={carrier} onChange={event => setCarrier(event.target.value)} placeholder="Automatic detection" /></label>
      <details><summary>Additional carrier details</summary><label>Destination postal code<input value={postalCode} onChange={event => setPostalCode(event.target.value)} maxLength={32} /></label><label>Origin country code<input value={origin} onChange={event => setOrigin(event.target.value)} minLength={2} maxLength={2} placeholder="MX" /></label><label>Shipping date<input type="date" value={shipDate} onChange={event => setShipDate(event.target.value)} /></label></details>
      <p className="muted">Checks PayPal, then ERP. If tracking is insufficient, 17TRACK may register the guide using the business tracking allowance.</p>
      <button className="button secondary" type="submit" disabled={busy}>{busy ? 'Checking tracking…' : 'Check shipment tracking'}</button>
    </form>}
  </section>;
}
