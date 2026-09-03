/**
 * Background download/cache for `kind: 'remote'` playables (both ordinary
 * network creatives and promo ones — same pipeline, see FeedCard.tsx) so a
 * card's game is already sitting on the device by the time the user swipes
 * to it, instead of only starting to fetch it right when it's needed.
 * useFeed.ts kicks off `prefetchAll` fire-and-forget as soon as the feed
 * list loads; FeedCard.tsx's LivePlayableFrame reads it back via
 * `getCachedPlayableHtml` and falls back to a live `src={url}` fetch
 * (today's behavior) whenever nothing's cached yet — a slow or failed
 * prefetch degrades to "load it live" rather than ever breaking the card.
 *
 * Uses the standard Cache Storage API — already available in any
 * Capacitor/Android WebView or desktop browser, no native plugin needed —
 * with a plain in-memory Map fallback if it's ever unavailable. These
 * playables are meant to be a single self-contained HTML file with no
 * external references (same constraint most playable-ad networks already
 * impose — see README's ad-provider research), so caching just the HTML
 * text is enough; there's no separate asset list to chase.
 */
const CACHE_NAME = 'swipeplayable-playables-v1'
const memoryFallback = new Map<string, string>()
const inFlight = new Map<string, Promise<void>>()

function hasCacheStorage(): boolean {
  return typeof caches !== 'undefined'
}

async function fetchAndStore(url: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) return

  if (hasCacheStorage()) {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(url, response.clone())
  } else {
    memoryFallback.set(url, await response.text())
  }
}

/**
 * Fire-and-forget. Never throws — a failed/slow prefetch just means this
 * URL falls back to a live fetch when its card becomes current, same as
 * every other FAILSAFE path in this codebase (see feedService.ts).
 * De-duped: calling this again for a URL already cached, or already being
 * fetched, is a cheap no-op rather than a second network request.
 */
export async function prefetchPlayable(url: string): Promise<void> {
  if (!url) return
  if (memoryFallback.has(url)) return
  if (inFlight.has(url)) return await inFlight.get(url)

  const task = (async () => {
    try {
      if (hasCacheStorage()) {
        const cache = await caches.open(CACHE_NAME)
        if (await cache.match(url)) return
      }
      await fetchAndStore(url)
    } catch (err) {
      console.warn('[playableCache] Prefetch failed — this card will fall back to a live fetch instead.', url, err)
    } finally {
      inFlight.delete(url)
    }
  })()

  inFlight.set(url, task)
  return task
}

/** Prefetches every `kind: 'remote'` creative's URL in the given list — see useFeed.ts, the single place this is called from. */
export function prefetchAll(entries: Array<{ kind: 'local' | 'remote'; entry: string }>): void {
  for (const { kind, entry } of entries) {
    if (kind === 'remote') void prefetchPlayable(entry)
  }
}

export async function getCachedPlayableHtml(url: string): Promise<string | null> {
  if (!url) return null
  try {
    if (hasCacheStorage()) {
      const cache = await caches.open(CACHE_NAME)
      const match = await cache.match(url)
      return match ? await match.text() : null
    }
    return memoryFallback.get(url) ?? null
  } catch (err) {
    console.warn('[playableCache] Cache read failed — falling back to a live fetch.', url, err)
    return null
  }
}
