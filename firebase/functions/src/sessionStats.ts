import { getFirestore, Timestamp } from 'firebase-admin/firestore'

interface RawEventDoc {
  name: string
  uid: string
  sessionId: string
  creativeId: string | null
  ts: Timestamp | null
}

export interface SessionStats {
  activeFocusedMs: number
  interactionCount: number
  hasRapidRepeatFlag: boolean
  creativeId: string | null
  /** Server timestamp (ms) of this session's playable_open event, or null if none was ever recorded. */
  openedAtMs: number | null
  eventCount: number
}

/**
 * Shared by qualifyEvents.ts (closed sessions) and fraudScoring.ts (a
 * session that may still be open at outbound-click time). Rebuilds
 * engagement stats from the events_raw trail using ONLY server
 * timestamps — the client's own reported numbers in event payloads are
 * for local debug/UI display only and are never read here.
 */
export async function computeSessionStats(sessionId: string): Promise<SessionStats> {
  const db = getFirestore()
  // Single equality filter — no composite index required.
  const snap = await db.collection('events_raw').where('sessionId', '==', sessionId).get()
  const events = snap.docs
    .map((d) => d.data() as RawEventDoc)
    .filter((e): e is RawEventDoc & { ts: Timestamp } => e.ts !== null && e.ts !== undefined)
    .sort((a, b) => a.ts.toMillis() - b.ts.toMillis())

  let activeFocusedMs = 0
  let interactionCount = 0
  let hasRapidRepeatFlag = false
  let openFocusStartMs: number | null = null
  let creativeId: string | null = null
  let openedAtMs: number | null = null

  for (const e of events) {
    if (e.creativeId && !creativeId) creativeId = e.creativeId
    const ms = e.ts.toMillis()
    switch (e.name) {
      case 'playable_open':
        if (openedAtMs === null) openedAtMs = ms
        break
      case 'playable_focus_start':
        openFocusStartMs = ms
        break
      case 'playable_focus_end':
        if (openFocusStartMs !== null) {
          activeFocusedMs += Math.max(0, ms - openFocusStartMs)
          openFocusStartMs = null
        }
        break
      case 'playable_interaction':
        interactionCount += 1
        break
      case 'suspicious_repeat_pattern':
        hasRapidRepeatFlag = true
        break
      default:
        break
    }
  }

  // Still-open session (no closing focus_end yet — e.g. an outbound click
  // fired mid-play): extend the trailing focus_start up to now instead of
  // undercounting it as zero.
  if (openFocusStartMs !== null) {
    activeFocusedMs += Math.max(0, Date.now() - openFocusStartMs)
  }

  return { activeFocusedMs, interactionCount, hasRapidRepeatFlag, creativeId, openedAtMs, eventCount: events.length }
}
