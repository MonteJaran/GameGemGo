import { useEffect, useState } from 'react'
import type { Creative } from '../types/creative'
import { loadFeedCreatives } from '../services/feed/feedService'

export interface FeedState {
  creatives: Creative[]
  loading: boolean
  error: string | null
  source: 'local' | 'firebase' | null
}

/**
 * Fetches feed data AFTER the calling screen has already mounted (and thus
 * already painted its shell) — never call this during the very first
 * render path in a way that blocks paint.
 *
 * Deliberately no "already loaded" ref guard: that pattern breaks under
 * React 18/19 StrictMode's dev-only double-invoke (the first effect's
 * `cancelled` flag discards its result, and a stale guard would then
 * block the second, real invocation from ever fetching — leaving the
 * screen stuck in `loading: true` forever in dev). Letting the effect run
 * twice in dev and rely purely on `cancelled` is the correct fix; in a
 * production build the effect only runs once anyway.
 */
export function useFeed(): FeedState {
  const [state, setState] = useState<FeedState>({ creatives: [], loading: true, error: null, source: null })

  useEffect(() => {
    let cancelled = false

    loadFeedCreatives()
      .then(({ creatives, source }) => {
        if (cancelled) return
        setState({ creatives, loading: false, error: null, source })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          creatives: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load feed',
          source: null,
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
