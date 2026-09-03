import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * Deliberately not react-router: this app has 6 fixed screens and no
 * nested layouts, so a ~50-line hash router keeps the startup bundle
 * smaller and gives us full control over when each screen's chunk loads.
 * (No dedicated "play" screen — the feed card itself is the live game,
 * see FeedCardStack/FeedCard.)
 */
export type Route =
  | { name: 'home' }
  | { name: 'game'; creativeId: string }
  | { name: 'profile' }
  | { name: 'privacy' }
  | { name: 'terms' }
  | { name: 'debug' }

function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  const segments = path.split('/').filter(Boolean)
  if (segments.length === 0) return { name: 'home' }
  if (segments[0] === 'game' && segments[1]) return { name: 'game', creativeId: decodeURIComponent(segments[1]) }
  if (segments[0] === 'profile') return { name: 'profile' }
  if (segments[0] === 'privacy') return { name: 'privacy' }
  if (segments[0] === 'terms') return { name: 'terms' }
  if (segments[0] === 'debug') return { name: 'debug' }
  return { name: 'home' }
}

function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'game':
      return `#/game/${encodeURIComponent(route.creativeId)}`
    case 'profile':
      return '#/profile'
    case 'privacy':
      return '#/privacy'
    case 'terms':
      return '#/terms'
    case 'debug':
      return '#/debug'
  }
}

interface RouterContextValue {
  route: Route
  navigate: (route: Route) => void
  back: () => void
}

const RouterContext = createContext<RouterContextValue | null>(null)

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function navigate(next: Route) {
    window.location.hash = routeToHash(next)
  }

  function back() {
    // Hash changes push history entries by default, so this returns to
    // whatever route was active before — falls back to home if there's
    // nowhere to go (e.g. deep link was the first entry).
    if (window.history.length > 1) {
      window.history.back()
    } else {
      navigate({ name: 'home' })
    }
  }

  return <RouterContext.Provider value={{ route, navigate, back }}>{children}</RouterContext.Provider>
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('useRouter must be used within RouterProvider')
  return ctx
}
