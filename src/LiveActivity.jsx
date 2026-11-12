import EmptyState from './EmptyState';
import React, { useState } from 'react';
import { useRemote } from './lib/useRemote';
import { activityKey, loadActivity } from './lib/workspace-data';
import { activityCategory } from './lib/live';
import RemoteState from './RemoteState';
import SegmentedFilters from './SegmentedFilters';
import Badge from './Badge';
import Icon from './Icon';
import { date, label } from './lib/format';
export default function LiveActivity({ api, onNavigate }) {
  const [filter, setFilter] = useState('All activity');
  const [query, setQuery] = useState('');
  const resource = useRemote(signal => loadActivity(api, signal), [api], { store: api.resources, key: activityKey() });
  return <><div className="filters transaction-toolbar activity-toolbar"><SegmentedFilters value={filter} onChange={setFilter} options={['All activity', 'Investigation', 'Verification', 'Review']} label="Activity filters" /><div className="search-field"><Icon name="Search" /><input className="search" type="search" aria-label="Search activity" placeholder="Search activity" value={query} onChange={event => setQuery(event.target.value)} /></div></div><RemoteState resource={resource}>{data => {
    const items = data.items.filter(event => (filter === 'All activity' || activityCategory(event) === filter) && `${label(event.action)} ${label(event.outcome)} ${label(event.resourceType)} ${event.id} ${event.transactionId || ''} ${JSON.stringify(event.record?.details || {})}`.toLowerCase().includes(query.trim().toLowerCase()));
    return <section className="card"><div className="dispute-activity-list">{items.map(event => <button type="button" className="dispute-activity-item" key={event.id} onClick={() => onNavigate(event)}><Icon name="Circle" className="dispute-activity-mark" /><span className="dispute-activity-copy"><strong>{label(event.action)}</strong><span className="dispute-activity-detail">{event.record?.details?.errorCode || label(event.resourceType)}</span><small>{date(event.createdAt)}</small></span><Badge>{label(event.outcome)}</Badge></button>)}</div>{!items.length && <EmptyState>{data.items.length ? 'No matching activity found.' : 'No activity found.'}</EmptyState>}</section>;
  }}</RemoteState></>;
}
