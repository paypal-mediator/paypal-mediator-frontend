import { label } from './format.js';
export function evidenceSnapshots(transaction, dossier) {
  const revisions = [...new Set([dossier.revision, ...dossier.items.map(item => item.version)])].sort((a, b) => b - a);
  return revisions.map(revision => {
    const latest = new Map();
    for (const item of [...dossier.items].sort((a, b) => a.version - b.version)) {
      if (item.version <= revision) latest.set(JSON.stringify([item.type, item.sourceSystem, item.externalReference]), item);
    }
    const items = [...latest.values()];
    const changed = dossier.items.find(item => item.version === revision);
    return { revision, items, createdAt: changed?.retrievedAt || transaction.createdAt,
      summary: changed ? `${label(changed.type)} recorded` : 'Initial records',
      checks: transaction.readiness.checks.filter(check => check.code !== 'ORDER_REFERENCE').map(check => {
        const records = items.filter(item => item.type === check.code);
        return { ...check, evidenceIds: records.map(item => item.id), status: revision === dossier.revision ? check.status : records.length ? records.every(item => item.integrity === 'VALID') ? 'PRESENT' : 'CONFLICT' : 'MISSING' };
      }),
    };
  });
}
