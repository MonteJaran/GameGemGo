/**
 * Local, per-device outbound-click history used to enforce the daily caps.
 * This is a client-side soft cap only — easily reset by clearing app
 * storage, which is exactly why Phase 2 must re-enforce the same caps
 * server-side (per creative + per user, keyed off Firestore/Functions,
 * optionally cross-checked against a hashed IP) before anything is treated
 * as revenue-eligible.
 */
const STORAGE_KEY = 'swipeplayable:outboundClicks:v1'
const MAX_STORED = 500

interface ClickRecord {
  ts: number
  creativeId: string
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function readAll(): ClickRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as ClickRecord[]) : []
  } catch {
    return []
  }
}

function writeAll(records: ClickRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-MAX_STORED)))
  } catch {
    // best-effort — a lost local cap history just means the local soft cap under-enforces, not a security hole
  }
}

export function recordOutboundClick(creativeId: string) {
  const all = readAll()
  all.push({ ts: Date.now(), creativeId })
  writeAll(all)
}

export function getOutboundClickCountsToday(creativeId: string): {
  forCreativeToday: number
  totalToday: number
  recentTimestamps: number[]
} {
  const today = dayKey(new Date())
  const todaysClicks = readAll().filter((r) => dayKey(new Date(r.ts)) === today)
  return {
    forCreativeToday: todaysClicks.filter((r) => r.creativeId === creativeId).length,
    totalToday: todaysClicks.length,
    recentTimestamps: todaysClicks.map((r) => r.ts),
  }
}
