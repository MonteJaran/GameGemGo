import { env } from '../../config/env'
import type { Creative } from '../../types/creative'
import { getLocalCreatives } from '../creatives/localCreativeRegistry'
import { fetchFirebaseCreatives } from '../creatives/firebaseCreativeReader'

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
    return { creatives: getLocalCreatives(), source: 'local' }
  }

  try {
    const remote = await fetchFirebaseCreatives()
    if (remote.length > 0) return { creatives: remote, source: 'firebase' }
    console.warn('[feedService] Firebase returned zero creatives, falling back to local seed.')
  } catch (err) {
    console.warn('[feedService] Firebase creative fetch failed, falling back to local seed.', err)
  }
  return { creatives: getLocalCreatives(), source: 'local' }
}
