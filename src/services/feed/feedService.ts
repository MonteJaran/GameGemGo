import { env } from '../../config/env'
import type { Creative } from '../../types/creative'
import { getLocalCreatives } from '../creatives/localCreativeRegistry'
import { fetchFirebaseCreatives } from '../creatives/firebaseCreativeReader'

/**
 * Last successfully loaded feed, keyed by id — lets GameDetailScreen (a
 * separate route, reached after the gatekeeper already ran) resolve a
 * Firebase-sourced creative without re-fetching. This was a known Phase 2
 * gap (the old PlayablePreviewScreen's comment: "also try the
 * last-fetched Firebase creative list before falling back to 'not
 * found'") — getLocalCreativeById alone only ever finds the 3 local_test
 * demos, so any real (Firebase) creative's "Open Game Page" tap would
 * otherwise dead-end on a false "not found" screen.
 */
let lastFetchedCreatives: Creative[] = []

export function getLastFetchedCreativeById(id: string): Creative | undefined {
  return lastFetchedCreatives.find((c) => c.id === id)
}

/**
 * Single place the UI asks for feed data. Never blocks first paint — call
 * this from a useEffect after the feed shell has already rendered, not
 * during initial render.
 *
 * Failsafe: any Firebase read failure (network, malformed config, Phase-2
 * stub not implemented yet) falls back to the local demo creatives so the
 * app is never empty.
 */
export async function loadFeedCreatives(): Promise<{ creatives: Creative[]; source: 'local' | 'firebase' }> {
  if (env.creativeSource === 'local') {
    const creatives = sortFeedOrder(getLocalCreatives())
    lastFetchedCreatives = creatives
    return { creatives, source: 'local' }
  }

  try {
    const remote = await fetchFirebaseCreatives()
    if (remote.length > 0) {
      const creatives = sortFeedOrder(remote)
      lastFetchedCreatives = creatives
      return { creatives, source: 'firebase' }
    }
    console.warn('[feedService] Firebase returned zero creatives, falling back to local seed.')
  } catch (err) {
    console.warn('[feedService] Firebase creative fetch failed, falling back to local seed.', err)
  }
  const fallback = sortFeedOrder(getLocalCreatives())
  lastFetchedCreatives = fallback
  return { creatives: fallback, source: 'local' }
}

/**
 * `placement: 'promo'` creatives always show first ("some company pays to
 * be on top of the feed, and it's always like that" — a prepaid placement,
 * not earned ranking). Stable sort: among promos, higher `priority` first;
 * everything else (including ties) keeps the order the source returned it
 * in. This is the single choke point for feed ordering — both the local
 * and Firebase sources go through it, so behavior is consistent either way.
 * `featured` creatives are scattered randomly among the non-promo ones
 * afterward — see `scatterFeatured` below.
 */
function sortFeedOrder(creatives: Creative[]): Creative[] {
  const indexed = creatives.map((creative, index) => ({ creative, index }))

  const promo = indexed
    .filter(({ creative }) => creative.placement === 'promo')
    .sort((a, b) => {
      const priorityDiff = (b.creative.priority ?? 0) - (a.creative.priority ?? 0)
      if (priorityDiff !== 0) return priorityDiff
      return a.index - b.index
    })
    .map(({ creative }) => creative)

  const rest = indexed.filter(({ creative }) => creative.placement !== 'promo').map(({ creative }) => creative)

  return [...promo, ...scatterFeatured(rest)]
}

/**
 * Drops each `placement: 'featured'` creative (the operator's own curated
 * filler content, not ad-network inventory — see creative.ts) at a random
 * index among the ordinary (`network`) creatives, one at a time. Runs
 * again on every `loadFeedCreatives()` call, so a featured game lands in a
 * different spot in the scroll on each fresh load rather than always
 * occupying the same slot — "randomly positioned across other playable
 * games". Everything else about a featured creative (framing, engagement/
 * click tracking) is identical to a `network` one; this function only
 * ever changes position, never what gets tracked or how it's rendered.
 */
function scatterFeatured(creatives: Creative[]): Creative[] {
  const featured = creatives.filter((c) => c.placement === 'featured')
  if (featured.length === 0) return creatives

  const result = creatives.filter((c) => c.placement !== 'featured')
  for (const creative of featured) {
    const index = Math.floor(Math.random() * (result.length + 1))
    result.splice(index, 0, creative)
  }
  return result
}
