import { LOCAL_CREATIVES } from '../../data/localCreatives'
import type { Creative } from '../../types/creative'

/** Minimal runtime shape check — a malformed creative must never crash the feed (failsafe requirement). */
function isValidCreative(c: unknown): c is Creative {
  if (!c || typeof c !== 'object') return false
  const r = c as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    r.id.length > 0 &&
    typeof r.title === 'string' &&
    r.title.length > 0 &&
    typeof r.genre === 'string' &&
    typeof r.playable === 'object' &&
    r.playable !== null &&
    typeof (r.playable as Record<string, unknown>).entry === 'string' &&
    typeof r.cta === 'object' &&
    r.cta !== null
  )
}

/** Reads the built-in TEST mode seed, dropping (and logging) anything malformed instead of throwing. */
export function getLocalCreatives(): Creative[] {
  const valid: Creative[] = []
  for (const candidate of LOCAL_CREATIVES) {
    if (isValidCreative(candidate)) {
      valid.push(candidate)
    } else {
      console.warn('[localCreativeRegistry] Skipping malformed local creative:', candidate)
    }
  }
  return valid
}

export function getLocalCreativeById(id: string): Creative | undefined {
  return getLocalCreatives().find((c) => c.id === id)
}
