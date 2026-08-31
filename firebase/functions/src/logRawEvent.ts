import './admin.js'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { checkRateLimit } from './rateLimit.js'

// Generous for real gameplay (bursts of taps, periodic threshold events)
// but well below what a scripted flood would produce.
const EVENT_RATE_LIMIT = { limit: 240, windowMs: 60_000 }

// Keep this list in sync with src/types/events.ts's EventName union.
const ALLOWED_EVENT_NAMES = new Set([
  'app_open',
  'feed_rendered',
  'card_visible_2s',
  'card_skip',
  'card_restore',
  'playable_open',
  'playable_focus_start',
  'playable_focus_end',
  'playable_interaction',
  'active_10s',
  'interaction_count_2',
  'qualified_engagement_candidate',
  'outbound_click',
  'suspicious_click_pattern',
  'suspicious_repeat_pattern',
  'blocked_click',
  'internal_test_user',
])

/**
 * The ONLY way a raw event reaches Firestore (see ../../firestore.rules —
 * events_raw denies all direct client writes). Validates shape, stamps a
 * server timestamp (the client's own `clientTs` is stored separately and
 * never trusted for qualification/fraud math), and writes with the Admin
 * SDK.
 *
 * This function intentionally does NOT compute qualification or fraud
 * decisions itself — see qualifyEvents.ts and fraudScoring.ts. Its only
 * job is "accept a well-formed event from a signed-in user, or reject it."
 */
export const logRawEvent = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign-in required.')
  }

  const data = request.data ?? {}
  const { name, sessionId, creativeId, payload, clientTs, environment } = data as Record<string, unknown>

  if (typeof name !== 'string' || !ALLOWED_EVENT_NAMES.has(name)) {
    throw new HttpsError('invalid-argument', 'Unknown or missing event name.')
  }
  if (typeof sessionId !== 'string' || sessionId.length === 0 || sessionId.length > 128) {
    throw new HttpsError('invalid-argument', 'Missing or malformed sessionId.')
  }
  if (creativeId !== undefined && (typeof creativeId !== 'string' || creativeId.length > 128)) {
    throw new HttpsError('invalid-argument', 'Malformed creativeId.')
  }

  const rate = await checkRateLimit({
    uid: request.auth.uid,
    bucket: 'logRawEvent',
    limit: EVENT_RATE_LIMIT.limit,
    windowMs: EVENT_RATE_LIMIT.windowMs,
  })
  if (!rate.allowed) {
    throw new HttpsError('resource-exhausted', 'Too many events — slow down.')
  }

  const db = getFirestore()
  await db.collection('events_raw').add({
    name,
    uid: request.auth.uid,
    sessionId,
    creativeId: typeof creativeId === 'string' ? creativeId : null,
    payload: payload && typeof payload === 'object' ? payload : null,
    clientTs: typeof clientTs === 'number' ? clientTs : null,
    environment: typeof environment === 'string' ? environment : 'unknown',
    ts: FieldValue.serverTimestamp(),
  })

  return { ok: true }
})
