import { preloadWorkspace } from './workspace-data.js';
import { routeFromLocation } from './routes.js';

export async function bootstrapWorkspace({ api, userId, location, storage, signal, loadComponent }) {
  const [module, teams] = await Promise.all([loadComponent(), api.merchants(signal)]);
  signal?.throwIfAborted();
  let selectedId;
  try { selectedId = storage.getItem(`account:${userId}:active-merchant`); } catch { /* Use the first accessible team. */ }
  const selected = teams.items.find(team => team.id === selectedId) || teams.items[0];
  const teamApis = new Map(teams.items.map(team => [team.id, api.forMerchant(team.id)]));
  const queue = [...teamApis.entries()].sort(([left], [right]) => Number(right === selected?.id) - Number(left === selected?.id));
  const selectedRoute = routeFromLocation(location);
  let next = 0;
  // Warm every accessible team without flooding the API for large memberships.
  await Promise.all(Array.from({ length: Math.min(3, queue.length) }, async () => {
    while (next < queue.length) {
      signal?.throwIfAborted();
      const [id, scopedApi] = queue[next++];
      await preloadWorkspace(scopedApi, id === selected?.id ? selectedRoute : { page: 'overview' });
    }
  }));
  signal?.throwIfAborted();
  return { userId, Component: module.default, teams, selectedTeamId: selected?.id || null, teamApi: teamApis.get(selected?.id) || null, teamApis };
}
