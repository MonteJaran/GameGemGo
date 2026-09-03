import { useEffect } from 'react'
import { useFeed } from '../hooks/useFeed'
import { FeedCardStack } from '../components/FeedCardStack'
import { EmptyState } from '../components/EmptyState'
import { useRouter } from '../router/router'
import { logEvent } from '../services/events/eventLogger'

/**
 * Boots directly into the feed — no splash/intro animation. Rendered
 * eagerly (not lazy) so it's part of the very first paint; everything it
 * needs beyond the static app bar (creative data) hydrates afterward via
 * useFeed, which only starts fetching from an effect.
 */
export function HomeFeedScreen() {
  const { navigate } = useRouter()
  const { creatives, loading, error } = useFeed()

  useEffect(() => {
    // Confirms the shell actually painted before logging it — cheap and non-blocking.
    const raf = requestAnimationFrame(() => logEvent('feed_rendered'))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="screen">
      <header className="app-bar">
        <h1 className="app-bar__title">GameGemGo</h1>
        <button
          className="icon-button tap-target"
          aria-label="Profile and settings"
          onClick={() => navigate({ name: 'profile' })}
        >
          👤
        </button>
      </header>

      {loading && creatives.length === 0 ? (
        <div className="card-stack" aria-busy="true">
          <div className="feed-card" style={{ position: 'relative', opacity: 0.5 }} />
        </div>
      ) : error ? (
        <EmptyState glyph="⚠️" title="Couldn't load the feed" body={error} />
      ) : creatives.length === 0 ? (
        <EmptyState glyph="📭" title="Nothing to show" body="No playable previews are available right now." />
      ) : (
        <FeedCardStack creatives={creatives} />
      )}
    </div>
  )
}
