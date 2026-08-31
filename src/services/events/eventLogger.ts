import { env } from '../../config/env'
import type { EventName, TrackedEvent } from '../../types/events'
import { newId } from '../../utils/id'
import { getCurrentProfile } from '../auth/authService'

const STORAGE_KEY = 'swipeplayable:events:v1'
const MAX_EVENTS = 500
let sessionId = newId('sess')

let buffer: TrackedEvent[] = loadPersisted()

function loadPersisted(): TrackedEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as TrackedEvent[]) : []
  } catch {
    return []
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer.slice(-MAX_EVENTS)))
  } catch {
    // best-effort only — losing local debug history is not fatal
  }
}

/** Called once per app boot from main.tsx so every event this session shares one sessionId. */
export function resetSession() {
  sessionId = newId('sess')
}

/**
 * Records one event locally (ring buffer + localStorage, for the Debug/
 * Profile screens) and — outside local_test — will additionally forward it
 * through a server transport.
 *
 * IMPORTANT: this is a *raw event log*, not a qualification decision. A
 * `qualified_engagement_candidate` entry here is still just a client
 * candidate; only Cloud Functions (Phase 2, see firebase/functions) can
 * turn it into an actual `qualified_events` record.
 */
export function logEvent(name: EventName, opts: { creativeId?: string; payload?: Record<string, unknown> } = {}) {
  const profile = getCurrentProfile()
  const event: TrackedEvent = {
    id: newId('evt'),
    name,
    ts: Date.now(),
    sessionId,
    userId: profile?.uid ?? 'unknown',
    environment: env.mode,
    creativeId: opts.creativeId,
    payload: opts.payload,
  }

  buffer.push(event)
  if (buffer.length > MAX_EVENTS) buffer = buffer.slice(-MAX_EVENTS)
  persist()

  if (!env.isProduction) {
    // eslint-disable-next-line no-console
    console.debug(`[event] ${name}`, event.creativeId ?? '', event.payload ?? '')
  }

  if (!env.isLocalTest) {
    void forwardToServer(event)
  }
}

let cachedLogRawEvent: ((data: unknown) => Promise<unknown>) | null = null

async function forwardToServer(event: TrackedEvent) {
  try {
    if (!cachedLogRawEvent) {
      const [{ getFirebaseFunctions }, { httpsCallable }] = await Promise.all([
        import('../firebase/firebaseClient'),
        import('firebase/functions'),
      ])
      const callable = httpsCallable(getFirebaseFunctions(), 'logRawEvent')
      cachedLogRawEvent = (data: unknown) => callable(data).then(() => undefined)
    }

    await cachedLogRawEvent({
      name: event.name,
      sessionId: event.sessionId,
      creativeId: event.creativeId,
      payload: event.payload,
      clientTs: event.ts,
      environment: event.environment,
    })
  } catch (err) {
    // FAILSAFE: a failed forward never blocks the app or retries
    // aggressively — it just means this one event is missing from the
    // server's copy of events_raw. Local ring buffer/localStorage above
    // already recorded it regardless, so Debug/Profile screens are
    // unaffected. NOTE: no batching yet — one callable invocation per
    // event is simplest for an MVP; worth revisiting if event volume
    // during active gameplay ever becomes a real cost/latency concern.
    console.warn('[eventLogger] Failed to forward event to server:', event.name, err)
  }
}

export function getEventLog(): readonly TrackedEvent[] {
  return buffer
}

export function clearEventLog() {
  buffer = []
  persist()
}

export function getSessionId(): string {
  return sessionId
}
