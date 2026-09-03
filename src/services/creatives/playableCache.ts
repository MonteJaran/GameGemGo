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
 * `prefetchAll` deliberately skips the first (topmost) entry and prefetches
 * the rest one at a time, in feed order, rather than all at once — see its
 * own doc comment below for why.
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

/**
 * Prefetches every `kind: 'remote'` creative's URL in the given list — see
 * useFeed.ts, the single place this is called from. Two deliberate choices
 * for keeping the *first* card's wait time as low as possible on a slow
 * connection:
 *
 * 1. Entry 0 is skipped here. It's whatever's on top of the freshly
 *    sorted feed (a promo, if one exists — see feedService.ts), and
 *    FeedCard's LivePlayableFrame already loads that exact URL directly
 *    via a live `<iframe src>` the moment it becomes the interactive top
 *    card, in parallel with this function running. Also fetch()-ing it
 *    here would just split one connection's bandwidth between two
 *    requests for the identical file — worse for that first card's speed,
 *    not better. (Its result still gets cached once loaded — see
 *    FeedCardStack.tsx's use of `getCachedPlayableHtml` — this only skips
 *    the redundant *prefetch*, not caching for next time.)
 * 2. Entries 1..N prefetch strictly in feed order, one at a time — never
 *    fired all at once. On a constrained connection, five simultaneous
 *    downloads all finish slowly together; sequential means the *next*
 *    card the user will actually reach finishes first, instead of
 *    competing with cards 4-5-6 they may never swipe to this session.
 *
 * Fire-and-forget from the caller's side (not awaited) — this function's
 * own sequencing is what changed, not whether callers wait on it.
 */
export function prefetchAll(entries: Array<{ kind: 'local' | 'remote'; entry: string }>): void {
  void (async () => {
    for (const { kind, entry } of entries.slice(1)) {
      if (kind !== 'remote') continue
      await prefetchPlayable(entry)
    }
  })()
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
