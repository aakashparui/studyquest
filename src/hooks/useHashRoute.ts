import { useCallback, useEffect, useState } from 'react';

export const ROUTES = ['dashboard', 'stats', 'history', 'achievements', 'settings'] as const;

export type Route = (typeof ROUTES)[number];

function readHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  return (ROUTES as readonly string[]).includes(raw) ? (raw as Route) : 'dashboard';
}

/** Hash routing: no dependency, and it works from a file:// build too. */
export function useHashRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => readHash());

  useEffect(() => {
    const onChange = (): void => setRoute(readHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    window.location.hash = `#/${next}`;
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return [route, navigate];
}
