// Memory-only, owned by one API instance (and therefore one selected team/session).
export function createResourceStore({ staleTime = 30000, now = Date.now } = {}) {
  const entries = new Map();
  function entryFor(key) {
    if (!entries.has(key)) entries.set(key, { snapshot: { data: null, loading: true, error: null }, listeners: new Set(), promise: null, loader: null, generation: 0, loaded: false });
    return entries.get(key);
  }
  function notify(entry, snapshot) {
    entry.snapshot = snapshot;
    for (const listener of entry.listeners) listener();
  }
  const store = {
    snapshot: key => entryFor(key).snapshot,
    subscribe(key, listener) {
      const entry = entryFor(key);
      entry.listeners.add(listener);
      return () => entry.listeners.delete(listener);
    },
    load(key, loader, { force = false } = {}) {
      const entry = entryFor(key);
      entry.loader = loader;
      if (entry.promise) return entry.promise;
      if (entry.loaded && !force && now() - entry.updatedAt < staleTime) return entry.snapshot.error ? Promise.reject(entry.snapshot.error) : Promise.resolve(entry.snapshot.data);
      const generation = ++entry.generation;
      const controller = new AbortController();
      entry.controller = controller;
      notify(entry, { ...entry.snapshot, loading: entry.snapshot.data === null, error: null });
      const promise = Promise.resolve().then(() => loader(controller.signal)).then(data => {
        if (entry.generation === generation) {
          entry.loaded = true;
          entry.updatedAt = now();
          notify(entry, { data, loading: false, error: null });
        }
        return data;
      }, error => {
        if (entry.generation === generation) {
          entry.loaded = true;
          entry.updatedAt = now();
          const data = [401, 403].includes(error.status) ? null : entry.snapshot.data;
          notify(entry, { data, loading: false, error });
        }
        throw error;
      }).finally(() => { if (entry.generation === generation) entry.promise = null; });
      entry.promise = promise;
      return promise;
    },
    invalidate() {
      for (const [key, entry] of entries) {
        ++entry.generation;
        entry.controller?.abort();
        entry.promise = null;
        entry.loaded = false;
        notify(entry, { ...entry.snapshot, loading: entry.snapshot.data === null, error: null });
        if (entry.listeners.size && entry.loader) store.load(key, entry.loader).catch(() => {});
      }
    },
  };
  return store;
}
