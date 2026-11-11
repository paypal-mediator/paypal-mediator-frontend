import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
const emptySnapshot = { data: null, loading: true, error: null };
// Each load owns a generation and an AbortSignal; late responses never replace new routes.
export function useRemote(loader, deps = [], { store, key, initialData } = {}) {
  const [state, setState] = useState(() => ({ data: initialData ?? null, loading: initialData === undefined, error: null }));
  const initial = useRef({ data: initialData, deps });
  const [version, setVersion] = useState(0);
  const generation = useRef(0);
  const currentLoader = useRef(loader);
  currentLoader.current = loader;
  const subscribe = useCallback(listener => store ? store.subscribe(key, listener) : () => {}, [store, key]);
  const getSnapshot = useCallback(() => store ? store.snapshot(key) : emptySnapshot, [store, key]);
  const cached = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (store) { store.load(key, signal => currentLoader.current(signal)).catch(() => {}); return; }
    if (version === 0 && initial.current.data !== undefined && deps.length === initial.current.deps.length && deps.every((value, index) => Object.is(value, initial.current.deps[index]))) return;
    const current = ++generation.current;
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });
    Promise.resolve().then(() => loader(controller.signal)).then(data => {
      if (!controller.signal.aborted && generation.current === current) setState({ data, loading: false, error: null });
    }).catch(error => {
      if (!controller.signal.aborted && generation.current === current) setState({ data: null, loading: false, error });
    });
    return () => controller.abort();
  }, [...deps, version, store, key]);
  const reload = useCallback(() => {
    if (store) return store.load(key, signal => currentLoader.current(signal), { force: true }).catch(() => {});
    setVersion(value => value + 1);
  }, [store, key]);
  return { ...(store ? cached : state), reload };
}
