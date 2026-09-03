import './admin.js'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { bumpPromoCounter } from './promoSpendGuard.js'

interface QualifiedEventDoc {
  creativeId: string | null
}

/**
 * Bills one promo campaign's prepaid balance for a real, qualified
 * engagement — fires on every new `qualified_events` doc, i.e. the same
 * authoritative, already-fraud-and-internal-test-filtered signal
 * qualifyEvents.ts establishes (server-side thresholds only, internal/QA
 * traffic excluded there before this ever runs). No-ops for an ordinary
 * network creative — see promoSpendGuard.ts's `bumpPromoCounter`, shared
 * with fraudScoring.ts's click-side hook, for the actual billing logic.
 */
export const trackPromoEngagementSpend = onDocumentCreated('qualified_events/{eventId}', async (event) => {
  const doc = event.data?.data() as QualifiedEventDoc | undefined
  const creativeId = doc?.creativeId
  if (!creativeId) return
  await bumpPromoCounter(creativeId, 'engagementsCount')
})
