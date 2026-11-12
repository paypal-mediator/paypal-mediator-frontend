import React, { useEffect, useRef } from 'react';
import Badge from './Badge';
import Icon from './Icon';
import { date, label } from './lib/format';

export default function ActivityDetails({ event, onClose, onTransaction }) {
  const dialog = useRef(null);
  useEffect(() => {
    const trigger = document.activeElement;
    dialog.current.showModal();
    return () => { if (trigger?.isConnected) trigger.focus(); };
  }, []);
  return <dialog ref={dialog} className="activity-details-dialog" aria-labelledby="activity-details-title" onCancel={onClose} onClick={click => { if (click.target === dialog.current) { const bounds = dialog.current.getBoundingClientRect(); if (click.clientX < bounds.left || click.clientX > bounds.right || click.clientY < bounds.top || click.clientY > bounds.bottom) onClose(); } }}>
    <header className="activity-details-heading"><div><small>Activity details</small><h2 id="activity-details-title">{label(event.action)}</h2></div><button className="settings-close" aria-label="Close activity details" onClick={onClose}><Icon name="X" /></button></header>
    <dl><div><dt>Status</dt><dd><Badge>{label(event.outcome)}</Badge></dd></div><div><dt>Occurred</dt><dd>{date(event.createdAt)}</dd></div><div><dt>Actor</dt><dd>{label(event.actorKind || 'System')}</dd></div><div><dt>Resource</dt><dd>{label(event.resourceType)}</dd></div><div><dt>Activity ID</dt><dd>{event.id}</dd></div>{event.resourceId && <div><dt>Resource ID</dt><dd>{event.resourceId}</dd></div>}{Object.entries(event.record?.details || {}).map(([key, value]) => <div key={key}><dt>{label(key.replace(/([A-Z])/g, ' $1'))}</dt><dd>{typeof value === 'boolean' ? value ? 'Yes' : 'No' : label(String(value))}</dd></div>)}{event.durationMs != null && <div><dt>Duration</dt><dd>{event.durationMs} ms</dd></div>}</dl>
    {event.transactionId && <div className="activity-details-footer"><button className="button primary" onClick={() => onTransaction(event.transactionId)}>View transaction<Icon name="ArrowUpRight" /></button></div>}
  </dialog>;
}
