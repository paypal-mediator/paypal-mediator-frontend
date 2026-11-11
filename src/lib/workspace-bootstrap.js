import { preloadWorkspace } from './workspace-data.js';
import { routeFromLocation } from './routes.js';

export async function bootstrapWorkspace({ api, userId, location, storage, signal, loadComponent }) {
  const [module, teams] = await Promise.all([loadComponent(), api.merchants(signal)]);
  signal?.throwIfAborted();
  let selectedId;
  try { selectedId = storage.getItem(`account:${userId}:active-merchant`); } catch { /* Use the first accessible team. */ }
  const selected = teams.items.find(team => team.id === selectedId) || teams.items[0];
  const teamApi = selected ? api.forMerchant(selected.id) : null;
  if (teamApi) await preloadWorkspace(teamApi, routeFromLocation(location));
  signal?.throwIfAborted();
  return { userId, Component: module.default, teams, selectedTeamId: selected?.id || null, teamApi };
}
