import { env } from '../../config/env'
import type { Creative, CreativePublic } from '../../types/creative'

/**
 * Reads only from the client-readable `ad_creatives_public` Firestore
 * collection (see firebase/firestore.rules — client write access is
 * denied there, always). Malformed docs are skipped, never thrown on —
 * feedService.ts still falls back to the local seed if this throws or
 * returns nothing usable (FAILSAFE REQUIREMENTS).
 */
export async function fetchFirebaseCreatives(): Promise<Creative[]> {
  const [{ getFirebaseDb }, { collection, getDocs }] = await Promise.all([
    import('../firebase/firebaseClient'),
    import('firebase/firestore'),
  ])

  const snap = await getDocs(collection(getFirebaseDb(), 'ad_creatives_public'))
  const creatives: Creative[] = []

  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    if (!isValidCreativePublic(data)) {
      console.warn('[firebaseCreativeReader] Skipping malformed remote creative:', docSnap.id, data)
      continue
    }
    creatives.push({
      ...data,
      id: docSnap.id,
      internal: {
        sourceId: docSnap.id,
        partnerId: null,
        createdAt: new Date().toISOString(),
        environment: env.mode,
        isTestCreative: false,
      },
    })
  }

  return creatives
}

function isValidCreativePublic(data: unknown): data is Omit<CreativePublic, 'id'> {
  if (!data || typeof data !== 'object') return false
  const r = data as Record<string, unknown>
  return (
    typeof r.title === 'string' &&
    r.title.length > 0 &&
    typeof r.genre === 'string' &&
    typeof r.playable === 'object' &&
    r.playable !== null &&
    typeof (r.playable as Record<string, unknown>).entry === 'string' &&
    typeof r.cta === 'object' &&
    r.cta !== null &&
    typeof r.thumbnail === 'object' &&
    r.thumbnail !== null
  )
}
