import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRemote } from './lib/useRemote';
import { activityKey, loadActivity, loadTransactions, prefetchDetails, warmWorkspace, preloadWorkspace, transactionKey, transactionListKey, workspacePrepared } from './lib/workspace-data';
import WorkspaceLoading from './WorkspaceLoading';
import EmptyState from './EmptyState';
import { routeFromLocation, routePath } from './lib/routes';
import { mergeTeamMemberships } from './lib/team';
import { notificationFromActivity } from './lib/live';
import RemoteState from './RemoteState';
import LiveEvidence from './LiveEvidence';
import DashboardOverview from './DashboardOverview';
import LiveActivity from './LiveActivity';
import ActivityDetails from './ActivityDetails';
import TeamOptions from './TeamOptions';
import RenameTeamDialog from './RenameTeamDialog';
import LiveSettings from './LiveSettings';
import { LiveDisputeList, LiveDisputeDetail } from './LiveDisputes';
import TransactionFilters from './TransactionFilters';
import PurchaseSummary from './PurchaseSummary';
import ProductThumbnail from './ProductThumbnail';
import SidebarIcon from './SidebarIcon';
import ProfileAvatar from './ProfileAvatar';
import Inbox from './Inbox';
import Icon from './Icon';
import Badge from './Badge';
import EmptyAccountDashboard from './EmptyAccountDashboard';
import TeamAccessDialog from './TeamAccessDialog';
import CreateMerchantDialog from './CreateMerchantDialog';
import {
  date,
  label,
  money,
  transactionName,
  transactionSubtitle,
} from './lib/format';
const navigation = [
  ['overview', 'Overview'],
  ['transactions', 'Transactions'],
  ['disputes', 'Disputes'],
  ['activity', 'Agent Activity'],
];
const rootPage = (route) =>
  route.page === 'dispute-details' || route.disputeId
    ? 'disputes'
    : ['details', 'evidence'].includes(route.page)
      ? 'transactions'
      : route.page;
function LiveTransactions({ api, onOpen }) {
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('All transactions');
  const resource = useRemote(signal => loadTransactions(api, signal), [api], { store: api.resources, key: transactionListKey() });
  return (
    <>
      <div className="filters transaction-toolbar">
        <TransactionFilters value={filter} onChange={setFilter} />
        <div className="search-field">
          <Icon name="Search" />
          <input
            type="search"
            className="search"
            aria-label="Search transactions"
            placeholder="Search transactions"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      <RemoteState resource={resource}>
        {(data) => {
          const items = data.items.filter(
            (item) =>
              (filter === 'All transactions' || item.readiness.status === (filter === 'Incomplete' ? 'INCOMPLETE' : 'NEEDS_REVIEW')) && `${item.paypalCaptureId} ${item.merchantOrderReference || ''} ${item.invoiceId || ''} ${item.order?.items.map(item => item.description).join(' ') || ''}`.toLowerCase().includes(query.trim().toLowerCase()),
          );
          return (
            <>
              <section className="card">
                <div className="table-wrap table-pointer-mode">
                  <table
                    className="transactions-table"
                    aria-label="Transactions"
                  >
                    <colgroup>
                      <col className="col-purchase" />
                      <col className="col-date" />
                      <col className="col-amount" />
                      <col className="col-status" />
                      <col className="col-protection" />
                    </colgroup>
                    <thead>
                      <tr>
                        {[
                          'Order',
                          'Payment received',
                          'Amount',
                          'Payment status',
                          'Readiness',
                        ].map((title) => (
                          <th scope="col" key={title}>
                            {title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          tabIndex={0}
                          onMouseEnter={() => prefetchDetails(api, 'evidence', item.id)}
                          onFocus={() => prefetchDetails(api, 'evidence', item.id)}
                          onClick={() => onOpen(item.id, item.paypalCaptureId)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onOpen(item.id, item.paypalCaptureId);
                            } else if (
                              event.key === 'ArrowDown' ||
                              event.key === 'ArrowUp'
                            ) {
                              event.preventDefault();
                              const rows = [
                                ...event.currentTarget.parentElement.children,
                              ];
                              rows[
                                (rows.indexOf(event.currentTarget) +
                                  (event.key === 'ArrowDown' ? 1 : -1) +
                                  rows.length) %
                                  rows.length
                              ]?.focus();
                            }
                          }}
                        >
                          <td>
                            <div className="product">
                              <ProductThumbnail />
                              <div>
                                <strong>
                                  {item.order?.externalId ||
                                    item.merchantOrderReference ||
                                    item.paypalCaptureId}
                                </strong>
                                <small>{transactionSubtitle(item)}</small>
                              </div>
                            </div>
                          </td>
                          <td><time className="transaction-received" dateTime={item.capturedAt} title={date(item.capturedAt)}><span>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(item.capturedAt))}</span><small>{new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(item.capturedAt))}</small></time></td>
                          <td>{money(item.amount)}</td>
                          <td>
                            <Badge>{label(item.status)}</Badge>
                          </td>
                          <td>
                            <Badge>{label(item.readiness.status)}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!items.length && (
                    <EmptyState>
                      {!data.items.length ? 'No transactions found.' : 'No matching transactions found.'}
                    </EmptyState>
                  )}
                </div>
              </section>

            </>
          );
        }}
      </RemoteState>
    </>
  );
}
function TransactionDetail({ api, id, onEvidence, onTitle }) {
  const resource = useRemote(
    (signal) => api.transaction(id, signal),
    [api, id],
    { store: api.resources, key: transactionKey(id) },
  );
  useEffect(() => {
    if (resource.data) onTitle(transactionName(resource.data));
  }, [resource.data?.paypalCaptureId]);
  // TEMPORARY demo-video shortcut: "5" toggles the tracking row to Ready.
  // Display only, nothing is saved. Remove after the demo recording.
  const [demoTrackingReady, setDemoTrackingReady] = useState(false);
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== '5' || event.repeat) return;
      if (event.target.closest?.('input, textarea, select, [contenteditable]'))
        return;
      setDemoTrackingReady((value) => !value);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <>
      <RemoteState resource={resource}>
        {(transaction) => (
          <div className="two-column detail-grid">
            <PurchaseSummary order={transaction} />
            <section className="card">
              <div className="card-heading">
                <h2>Document coverage</h2>
              </div>
              {transaction.readiness.checks.map((check) => (
                <div className="settings-info-row" key={check.code}>
                  <span>{label(check.code)}</span>
                  <Badge>
                    {demoTrackingReady && check.code === 'TRACKING'
                      ? 'Ready'
                      : label(check.status)}
                  </Badge>
                </div>
              ))}
              <div className="card-bottom button-row coverage-actions">
                <button
                  className="button primary"
                  onMouseEnter={() => prefetchDetails(api, 'evidence', id)}
                  onFocus={() => prefetchDetails(api, 'evidence', id)}
                  onClick={() => onEvidence(id)}
                >
                  View evidence
                </button>
              </div>
            </section>
          </div>
        )}
      </RemoteState>
    </>
  );
}
export default function ConnectedApp({ api, auth, session, initialTeams, initialSelectedTeamId, initialTeamApi, initialTeamApis }) {
  const teams = useRemote((signal) => api.merchants(signal), [api], { initialData: initialTeams });
  const [teamDialog, setTeamDialog] = useState(null);
  const [teamUpdates, setTeamUpdates] = useState([]);
  const [renamingTeam, setRenamingTeam] = useState(null);
  const arrangementKey = `account:${session.user.id}:team-arrangement`;
  const [arrangement, setArrangement] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem(arrangementKey)); return { order: Array.isArray(saved?.order) ? saved.order : [], pinned: Array.isArray(saved?.pinned) ? saved.pinned : [] }; } catch { return { order: [], pinned: [] }; }
  });
  const arrangeTeams = next => { setArrangement(next); try { localStorage.setItem(arrangementKey, JSON.stringify(next)); } catch { /* Keep this session's order. */ } };

  const teamSelectionKey = `account:${session.user.id}:active-merchant`;
  const [selectedTeamId, setSelectedTeamId] = useState(() => { if (initialSelectedTeamId) return initialSelectedTeamId; try { return localStorage.getItem(teamSelectionKey); } catch { return null; } });
  const expansionKey = `account:${session.user.id}:expanded-teams`;
  const [expandedTeamIds, setExpandedTeamIds] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem(expansionKey)); if (Array.isArray(saved)) return saved.filter(id => typeof id === 'string'); } catch { /* Use the initial team. */ }
    return [initialSelectedTeamId || initialTeams?.items[0]?.id].filter(Boolean);
  });
  useEffect(() => { try { localStorage.setItem(expansionKey, JSON.stringify(expandedTeamIds)); } catch { /* Expansion remains available without storage. */ } }, [expansionKey, expandedTeamIds]);
  const memberships = useMemo(() => mergeTeamMemberships(teams.data?.items || [], teamUpdates), [teams.data, teamUpdates]);
  const orderedTeams = [...memberships].sort((a, b) => {
    const rank = id => arrangement.order.includes(id) ? arrangement.order.indexOf(id) : arrangement.order.length + memberships.findIndex(team => team.id === id);
    return Number(arrangement.pinned.includes(b.id)) - Number(arrangement.pinned.includes(a.id)) || rank(a.id) - rank(b.id);
  });
  const moveTeam = (id, direction) => {
    const order = orderedTeams.map(team => team.id), index = order.indexOf(id), target = index + direction;
    if (target < 0 || target >= order.length || arrangement.pinned.includes(id) !== arrangement.pinned.includes(order[target])) return;
    [order[index], order[target]] = [order[target], order[index]];
    arrangeTeams({ ...arrangement, order });
  };
  const pinTeam = id => arrangeTeams({ order: orderedTeams.map(team => team.id), pinned: arrangement.pinned.includes(id) ? arrangement.pinned.filter(item => item !== id) : [...arrangement.pinned, id] });
  const selected = memberships.find(team => team.id === selectedTeamId) || teams.data?.items[0];
  const scopedApis = useRef({ root: api, teams: new Map(initialTeamApis || (initialSelectedTeamId && initialTeamApi ? [[initialSelectedTeamId, initialTeamApi]] : [])) });
  const teamApi = useMemo(() => {
    if (!selected) return api;
    if (scopedApis.current.root !== api) scopedApis.current = { root: api, teams: new Map() };
    if (!scopedApis.current.teams.has(selected.id)) scopedApis.current.teams.set(selected.id, api.forMerchant(selected.id));
    return scopedApis.current.teams.get(selected.id);
  }, [api, selected?.id]);
  const toggleTeam = (id, expanded) => {
    if (!memberships.some(team => team.id === id)) return;
    setExpandedTeamIds(current => {
      const open = expanded ?? !current.includes(id);
      return open ? [...new Set([...current, id])] : current.filter(value => value !== id);
    });
  };
  const selectTeam = (id, { settings = false, page = 'overview' } = {}) => {
    if (!memberships.some(team => team.id === id)) return;
    const path = settings ? '/settings' : routePath({ page });
    if (window.location.pathname !== path) window.history.pushState(null, '', path);
    toggleTeam(id, true);
    setSelectedTeamId(id);
    try { localStorage.setItem(teamSelectionKey, id); } catch { /* Selection remains available without storage. */ }
  };
  const updateTeam = team => setTeamUpdates(current => mergeTeamMemberships(current, [team]));
  return (
    <>
    <RemoteState resource={teams}>
      {() => !selected ? (
        <EmptyAccountDashboard api={api} auth={auth} session={session} teams={memberships} onSelectTeam={selectTeam} onCreateTeam={() => setTeamDialog('create')} onJoinTeam={() => setTeamDialog('join')} />
      ) : (
        <PreparedMerchantWorkspace key={selected.id} api={teamApi} auth={auth} session={session} teams={orderedTeams} arrangement={arrangement} onMoveTeam={moveTeam} onPinTeam={pinTeam} onRenameTeam={setRenamingTeam} expandedTeamIds={expandedTeamIds} onToggleTeam={toggleTeam} onSelectTeam={selectTeam} onTeamUpdated={updateTeam} onCreateTeam={() => setTeamDialog('create')} />
      )}
    </RemoteState>
    {renamingTeam && <RenameTeamDialog team={renamingTeam} onClose={() => setRenamingTeam(null)} onSave={async displayName => { const scopedApi = scopedApis.current.teams.get(renamingTeam.id) || api.forMerchant(renamingTeam.id); const updated = await scopedApi.updateMerchant({ displayName }); updateTeam(updated); }} />}
    {teamDialog === 'create' && <CreateMerchantDialog account={{ displayName: session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || '', email: session.user.email || '' }} onClose={() => setTeamDialog(null)} onOpenTeam={team => { selectTeam(team.id); setTeamDialog(null); }} onCreate={async details => { const team = await api.createMerchant({ displayName: details.displayName }); updateTeam(team); return team; }} />}
    {teamDialog === 'join' && <TeamAccessDialog mode="join" api={api} onClose={() => setTeamDialog(null)} onComplete={() => { setTeamDialog(null); teams.reload(); }} />}
    </>
  );
}

function PreparedMerchantWorkspace(props) {
  const route = routeFromLocation(window.location);
  const ready = useRemote(() => preloadWorkspace(props.api, route), [props.api], { initialData: workspacePrepared(props.api, route) ? true : undefined });
  if (ready.loading) return <WorkspaceLoading />;
  return <MerchantWorkspace {...props} />;
}

function MerchantWorkspace({ api, auth, session, teams, arrangement, onMoveTeam, onPinTeam, onRenameTeam, expandedTeamIds, onToggleTeam, onSelectTeam, onTeamUpdated, onCreateTeam }) {
  const core = useRemote((signal) => api.merchant(signal), [api], { store: api.resources, key: 'merchant' });
  const activity = useRemote(
    (signal) => loadActivity(api, signal),
    [api],
    { store: api.resources, key: activityKey() },
  );
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [merchantOverride, setMerchantOverride] = useState(null);
  const merchant = merchantOverride || core.data;
  const [route, setRoute] = useState(() => routeFromLocation(window.location)),
    [settings, setSettings] = useState(route.settings || null),
    [inboxOpen, setInboxOpen] = useState(false),
    [accountOpen, setAccountOpen] = useState(false),
    [error, setError] = useState('');
  const prefKey = `account:${session.user.id}:sidebar-closed`;
  const [sidebarClosed, setSidebarClosed] = useState(() => {
    try {
      return localStorage.getItem(prefKey) === 'true';
    } catch {
      return false;
    }
  });
  const [scrolled, setScrolled] = useState(false),
    [keyboard, setKeyboard] = useState(false);
  const topbar = useRef(null),
    toggle = useRef(null),
    sidebar = useRef(null),
    dropdown = useRef(null);
  const account = {
    id: session.user.id,
    displayName:
      session.user.user_metadata?.display_name ||
      session.user.user_metadata?.full_name ||
      session.user.email,
    email: session.user.email,
  };
  const go = (next) => {
    const destination = typeof next === 'string' ? { page: next } : next;
    const path = routePath(destination);
    if (window.location.pathname !== path)
      window.history.pushState(null, '', path);
    setRoute(destination);
    setInboxOpen(false);
    setAccountOpen(false);
    window.scrollTo({ top: 0 });
  };
  const openSettings = (scope) => {
    setSettings(scope);
    setAccountOpen(false);
    setInboxOpen(false);
  };
  const signOut = async () => {
    try {
      const { error } = await auth.auth.signOut();
      if (error) throw error;
    } catch (failure) {
      setError(failure.message);
    }
  };
  useEffect(() => {
    if (!topbar.current) return;
    const observer = new IntersectionObserver(([entry]) =>
      setScrolled(
        !entry.isIntersecting && entry.boundingClientRect.bottom <= 0,
      ),
    );
    observer.observe(topbar.current);
    return () => observer.disconnect();
  }, [!!merchant]);
  useEffect(() => { warmWorkspace(api); }, [api]);
  useEffect(() => {
    const timer = setInterval(activity.reload, 30000);
    return () => clearInterval(timer);
  }, [activity.reload]);
  useEffect(() => {
    const pointer = (event) => {
      if (event.type === 'pointermove' && !event.movementX && !event.movementY)
        return;
      document.documentElement.dataset.inputMode = 'pointer';
      setKeyboard(false);
    };
    const click = (event) => {
      if (!dropdown.current?.contains(event.target)) setAccountOpen(false);
    };
    const keys = (event) => {
      if (
        ['Tab', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(
          event.key,
        )
      )
        document.documentElement.dataset.inputMode = 'keyboard';
      if (event.defaultPrevented || settings) return;
      if (event.key === 'Escape') {
        if (inboxOpen) {
          setInboxOpen(false);
          return;
        }
        if (accountOpen) {
          setAccountOpen(false);
          return;
        }
        if (event.target.closest?.('input, textarea, select')) {
          event.target.blur();
          return;
        }
        if (route.page === 'evidence')
          go(
            route.disputeId
              ? {
                  page: 'dispute-details',
                  id: route.disputeId,
                  title: route.disputeTitle,
                }
              : { page: 'details', id: route.id, title: route.title },
          );
        else if (route.page === 'dispute-details') go('disputes');
        else if (route.page === 'details') go('transactions');
        else if (sidebarClosed) toggle.current?.focus();
        else {
          setKeyboard(true);
          sidebar.current?.querySelector('[aria-current="page"]')?.focus();
        }
        return;
      }
      if (
        inboxOpen ||
        accountOpen ||
        event.altKey ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        !event.target.closest?.('.team-sidebar')
      )
        return;
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        setKeyboard(true);
        const buttons = [
          ...sidebar.current.querySelectorAll(
            '.team-folder, [data-sidebar-tab]',
          ),
        ].filter((button) => !button.closest('[hidden]'));
        const index = buttons.indexOf(document.activeElement);
        const next =
          buttons[
            (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
              buttons.length
          ];
        next?.focus();
        if (next?.hasAttribute('data-sidebar-tab')) next.click();
      }
    };
    window.addEventListener('pointermove', pointer);
    window.addEventListener('pointerdown', pointer);
    document.addEventListener('click', click);
    window.addEventListener('keydown', keys);
    return () => {
      window.removeEventListener('pointermove', pointer);
      window.removeEventListener('pointerdown', pointer);
      document.removeEventListener('click', click);
      window.removeEventListener('keydown', keys);
    };
  }, [settings, inboxOpen, accountOpen, route, sidebarClosed]);
  useEffect(() => {
    const canonicalPath = routePath(route);
    if (window.location.pathname !== canonicalPath) window.history.replaceState(null, '', canonicalPath);
    const restoreRoute = () => {
      const destination = routeFromLocation(window.location);
      setRoute(destination);
      setSettings(destination.settings || null);
      setInboxOpen(false);
      setAccountOpen(false);
    };
    window.addEventListener('popstate', restoreRoute);
    return () => window.removeEventListener('popstate', restoreRoute);
  }, []);
  const navigateActivity = event => {
    setInboxOpen(false);
    setSelectedActivity(event);
  };

  if (!merchant)
    return (
      <div className="signed-out">
        <section>
          <RemoteState resource={core}>{() => null}</RemoteState>
          <button className="button secondary" onClick={signOut}>
            Sign out
          </button>
        </section>
      </div>
    );
  const current = rootPage(route),
    admin = merchant.role === 'ADMIN';
  const crumbs = [
    { name: merchant.displayName },
    { name: navigation.find(([id]) => id === current)?.[1], target: current },
  ];
  if (route.page === 'details') crumbs.push({ name: route.title || route.id });
  if (route.page === 'dispute-details')
    crumbs.push({ name: route.title || route.id });
  if (route.page === 'evidence') {
    crumbs.push(
      route.disputeId
        ? {
            name: route.disputeTitle || route.disputeId,
            target: {
              page: 'dispute-details',
              id: route.disputeId,
              title: route.disputeTitle,
            },
          }
        : {
            name: route.title || route.id,
            target: { page: 'details', id: route.id, title: route.title },
          },
    );
    crumbs.push({ name: 'Evidence' });
  }
  return (
    <div className={`app-shell ${sidebarClosed ? 'sidebar-collapsed' : ''}`}>
      <button
        type="button"
        className={`sidebar-toggle ${sidebarClosed && scrolled ? 'is-floating' : ''}`}
        ref={toggle}
        aria-label={sidebarClosed ? 'Open sidebar' : 'Close sidebar'}
        aria-controls="connected-sidebar"
        aria-expanded={!sidebarClosed}
        onClick={() => {
          const closed = !sidebarClosed;
          setSidebarClosed(closed);
          setInboxOpen(false);
          try {
            localStorage.setItem(prefKey, String(closed));
          } catch {
            /* Local preferences are optional. */
          }
        }}
      >
        <Icon
          name={sidebarClosed ? 'PanelLeftOpen' : 'PanelLeftClose'}
          size={18}
        />
      </button>
      <aside
        id="connected-sidebar"
        className={`sidebar ${keyboard ? 'sidebar-keyboard-mode' : ''}`}
        hidden={sidebarClosed}
        ref={sidebar}
      >
        <nav className="team-sidebar" aria-label="Teams">
          {teams.map((team, teamIndex) => {
            const active = team.id === merchant.id;
            const expanded = expandedTeamIds.includes(team.id);
            const displayName = team.displayName;
            const pinned = arrangement.pinned.includes(team.id);
            const sameGroup = index => teams[index] && arrangement.pinned.includes(teams[index].id) === pinned;
            return <div className="sidebar-team" key={team.id}>
            <div className="team-heading-row">
              <button
                type="button"
                className={`team-folder ${active ? 'current' : ''}`}
                title={displayName}
                aria-label={displayName}
                aria-controls={`connected-team-pages-${team.id}`}
                aria-expanded={expanded}
                onClick={() => onToggleTeam(team.id)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                    event.preventDefault();
                    onToggleTeam(team.id, event.key === 'ArrowRight');
                  }
                }}
              >
                <SidebarIcon name="folder" />
                <span>{displayName}</span>
                <Icon
                  name={expanded ? 'ChevronDown' : 'ChevronRight'}
                  className="team-toggle-chevron"
                />
                {pinned && <Icon name="Pin" className="team-pinned-icon" aria-label="Pinned" />}
              </button>
              <TeamOptions name={displayName} pinned={pinned} canMoveUp={Boolean(sameGroup(teamIndex - 1))} canMoveDown={Boolean(sameGroup(teamIndex + 1))} onMove={direction => onMoveTeam(team.id, direction)} onPin={() => onPinTeam(team.id)} canManage={team.role === 'ADMIN'} onRename={() => onRenameTeam(team)} onSettings={() => active ? openSettings('merchant') : onSelectTeam(team.id, { settings: true })} />
            </div>
            <div
              className="team-folder-pages"
              id={`connected-team-pages-${team.id}`}
              hidden={!expanded}
            >
              {navigation.map(([id, title]) => (
                <button
                  type="button"
                  key={id}
                  className={`nav-item ${active && current === id ? 'active' : ''}`}
                  data-sidebar-tab
                  aria-current={active && current === id ? 'page' : undefined}
                  onClick={() => active ? go(id) : onSelectTeam(team.id, { page: id })}
                >
                  <SidebarIcon name={id} />
                  {title}
                </button>
              ))}
            </div>
          </div>;
          })}
          <div className="team-heading-row"><button type="button" className="team-folder new-team-option" onClick={onCreateTeam}><Icon name="Plus" className="sidebar-icon" /><span>New team</span></button></div>
        </nav>
      </aside>
      <Inbox
        account={account}
        teams={teams}
        notifications={(activity.data?.items || []).map(
          notificationFromActivity,
        )}
        hidden={sidebarClosed}
        open={inboxOpen}
        onToggle={() => setInboxOpen((value) => !value)}
        onClose={() => setInboxOpen(false)}
        onNavigate={(item) => navigateActivity(item.event)}
      />
      <main>
        <header className="topbar" ref={topbar}>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ol>
              {crumbs.map((crumb, index) => (
                <li key={index}>
                  {index > 0 && <span className="breadcrumb-separator">/</span>}
                  {index === 0 ? (
                    <span className="breadcrumb-root">{crumb.name}</span>
                  ) : index === crumbs.length - 1 ? (
                    <span className="breadcrumb-current" aria-current="page">
                      {crumb.name}
                    </span>
                  ) : (
                    <a
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        go(crumb.target);
                      }}
                    >
                      {crumb.name}
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <div className="topbar-right">
            <div className="account-dropdown" ref={dropdown}>
              <button
                className="account-profile"
                aria-label="Account menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((value) => !value)}
              >
                <ProfileAvatar small />
              </button>
              {accountOpen && (
                <div className="account-menu">
                  <button onClick={() => openSettings('account')}>
                    <Icon name="Settings" />
                    Account settings
                  </button>
                  <button onClick={signOut}>
                    <Icon name="LogOut" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="workspace">
          {error && <p role="alert">{error}</p>}
          {activity.error && (
            <p className="live-error" role="alert">
              Notifications could not be loaded.{' '}
              <button className="text-button" onClick={activity.reload}>
                Retry
              </button>
            </p>
          )}
          {route.page === 'overview' && (
            <DashboardOverview api={api} onPage={go} onTransaction={item => go({ page: 'details', id: item.id, title: item.paypalCaptureId })} onDispute={item => go({ page: 'dispute-details', id: item.id, title: item.paypalDisputeId })} onActivity={navigateActivity} />
          )}
          {route.page === 'transactions' && (
            <LiveTransactions
              api={api}
              onOpen={(id, title) => go({ page: 'details', id, title })}
            />
          )}
          {route.page === 'details' && (
            <TransactionDetail
              key={route.id}
              api={api}
              id={route.id}
              admin={admin}
              onEvidence={(id) =>
                go({ page: 'evidence', id, title: route.title })
              }
              onTitle={(title) => setRoute((value) => ({ ...value, title }))}
            />
          )}
          {route.page === 'evidence' && (
            <LiveEvidence
              key={route.id}
              api={api}
              transactionId={route.id}
              admin={admin}
            />
          )}
          {route.page === 'disputes' && (
            <LiveDisputeList
              api={api}
              onOpen={(id, title) => go({ page: 'dispute-details', id, title })}
            />
          )}
          {route.page === 'dispute-details' && (
            <LiveDisputeDetail
              key={route.id}
              api={api}
              disputeId={route.id}
              merchant={merchant}
              onTitle={(title) => setRoute((value) => ({ ...value, title }))}
              onTransaction={(id) => go({ page: 'details', id })}
              onEvidence={(id) =>
                go({
                  page: 'evidence',
                  id,
                  disputeId: route.id,
                  disputeTitle: route.title,
                })
              }
            />
          )}
          {route.page === 'activity' && (
            <LiveActivity api={api} onNavigate={navigateActivity} />
          )}
        </div>
      </main>
      {selectedActivity && <ActivityDetails key={selectedActivity.id} event={selectedActivity} onClose={() => setSelectedActivity(null)} onTransaction={id => { setSelectedActivity(null); go({ page: 'details', id }); }} />}
      {settings && (
        <LiveSettings
          key={settings}
          api={api}
          auth={auth}
          user={session.user}
          merchant={merchant}
          scope={settings}
          onSaved={updated => { setMerchantOverride(updated); onTeamUpdated(updated); }}
          onClose={() => {
            setSettings(null);
            if (window.location.pathname === '/settings') go('overview');
          }}
        />
      )}
    </div>
  );
}
