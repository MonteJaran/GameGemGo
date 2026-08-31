import './admin.js'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { computeSessionStats } from './sessionStats.js'

// Mirrors src/services/qualification/qualificationEngine.ts's
// QUALIFICATION_THRESHOLDS — the two are not shared code (client bundle
// stays dependency-free of Admin SDK types), so keep them in sync by hand.
export const QUALIFICATION_THRESHOLDS = {
  impressionMs: 2000,
  engagedActiveMs: 10000,
  engagedMinInteractions: 2,
} as const

interface RawEventDoc {
  name: string
  uid: string
  sessionId: string
}

/**
 * THE authoritative qualification step. Client-emitted
 * `qualified_engagement_candidate` events (see eventLogger.ts) are only
 * ever candidates for UI/local-debug purposes — a row in `qualified_events`
 * is what actually counts, and it only ever comes from here.
 *
 * Fires on every new events_raw doc; only acts on `playable_focus_end`
 * (the point a session — or a pause in one — closes), then rebuilds the
 * whole session from its raw event trail via computeSessionStats(), which
 * uses server timestamps only.
 */
export const qualifyEvents = onDocumentCreated('events_raw/{eventId}', async (event) => {
  const doc = event.data?.data() as RawEventDoc | undefined
  if (!doc || doc.name !== 'playable_focus_end' || !doc.sessionId) return

  const db = getFirestore()
  const sessionId = doc.sessionId

  // Idempotency: a retried/duplicated playable_focus_end (or a session
  // that pauses/resumes and closes more than once) shouldn't redo this.
  const qualifiedRef = db.collection('qualified_events').doc(sessionId)
  if ((await qualifiedRef.get()).exists) return

  // Internal/QA traffic must never become a qualified_events row. This
  // field is server-set only (see firestore.rules) — the client can't
  // flip it on itself to test the "excluded" path, by design.
  const userSnap = await db.collection('users').doc(doc.uid).get()
  if (userSnap.exists && userSnap.data()?.isInternalTestUser === true) return

  const stats = await computeSessionStats(sessionId)

  const qualifies =
    stats.activeFocusedMs >= QUALIFICATION_THRESHOLDS.engagedActiveMs &&
    stats.interactionCount >= QUALIFICATION_THRESHOLDS.engagedMinInteractions &&
    !stats.hasRapidRepeatFlag

  if (!qualifies) return

  await qualifiedRef.set({
    sessionId,
    uid: doc.uid,
    creativeId: stats.creativeId,
    activeFocusedMs: stats.activeFocusedMs,
    interactionCount: stats.interactionCount,
    qualifiedAt: FieldValue.serverTimestamp(),
  })
})
