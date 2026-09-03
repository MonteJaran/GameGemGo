#!/usr/bin/env node
/**
 * Read-only performance readout for one creative: when in the playthrough
 * players tend to leave, how many reach genuine engagement, and a few
 * plain-language suggestions — built from `playable_focus_end` events
 * (see src/services/session/playableSessionManager.ts's `end()`, the only
 * writer of that event's `payload: { sessionId, reason, activeFocusedMs,
 * interactionCount, finalLevel }`). This is the raw material behind "when
 * did players skip the ad" — `activeFocusedMs` at exit IS that number, in
 * milliseconds. Never writes anything.
 *
 * Aggregate only — this never surfaces a single session/user, only
 * counts/percentages across all of them (see PrivacyScreen.tsx's "What a
 * promoted app's company actually receives"). Sharing a report like this
 * with the partner who owns the creative is exactly the aggregate,
 * non-identifying performance signal that policy describes.
 *
 * Needs a service account key, same as promo-billing-report.mjs:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
 *     node scripts/creative-performance-report.mjs <creativeId>
 *
 * Depends on Phase 2 being deployed and the creative having real traffic —
 * see LAUNCH_CHECKLIST.md. Running it now (still local_test, nothing
 * deployed) will just report zero sessions; that's expected, not a bug —
 * this script is written now so it's ready the moment there's real data.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const BUCKETS = [
  { label: '<1s', maxMs: 1000 },
  { label: '1-2s', maxMs: 2000 },
  { label: '2-3s', maxMs: 3000 },
  { label: '3-5s', maxMs: 5000 },
  { label: '5-10s', maxMs: 10000 },
  { label: '10s+', maxMs: Infinity },
]

function bucketFor(ms) {
  return BUCKETS.find((b) => ms < b.maxMs)?.label ?? '10s+'
}

function pct(part, whole) {
  return whole === 0 ? '0.0%' : `${((part / whole) * 100).toFixed(1)}%`
}

function median(sorted) {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

const [, , creativeId] = process.argv
if (!creativeId) {
  console.error('Usage: node creative-performance-report.mjs <creativeId>')
  process.exit(1)
}

initializeApp({ credential: applicationDefault() })
const db = getFirestore()

const [opensSnap, exitsSnap, clicksSnap] = await Promise.all([
  db.collection('events_raw').where('creativeId', '==', creativeId).where('name', '==', 'playable_open').get(),
  db.collection('events_raw').where('creativeId', '==', creativeId).where('name', '==', 'playable_focus_end').get(),
  db.collection('events_raw').where('creativeId', '==', creativeId).where('name', '==', 'outbound_click').get(),
])

console.log('='.repeat(64))
console.log(`Creative performance report — ${creativeId}`)
console.log(`  opens: ${opensSnap.size}   exit samples: ${exitsSnap.size}   outbound clicks: ${clicksSnap.size}`)

if (exitsSnap.size === 0) {
  console.log('\nNo playable_focus_end events recorded yet for this creative — nothing to report.')
  console.log('='.repeat(64))
  process.exit(0)
}

// De-dupe by sessionId: visibility-change ("paused") focus-end events can
// fire multiple times per session before the real exit (see
// playableSessionManager.ts's onVisibilityChange vs end()) — keep only the
// last one per session so a session isn't counted twice in the histogram.
const bySession = new Map()
for (const doc of exitsSnap.docs) {
  const d = doc.data()
  const ts = d.ts?.toMillis?.() ?? 0
  const prev = bySession.get(d.sessionId)
  if (!prev || ts >= prev.ts) bySession.set(d.sessionId, { ts, payload: d.payload ?? {} })
}
const sessions = [...bySession.values()].map((s) => s.payload)

const activeMsList = sessions.map((p) => (typeof p.activeFocusedMs === 'number' ? p.activeFocusedMs : 0)).sort((a, b) => a - b)
const total = sessions.length

console.log(`\nTime-to-exit distribution (${total} unique sessions):`)
for (const bucket of BUCKETS) {
  const count = activeMsList.filter((ms) => bucketFor(ms) === bucket.label).length
  console.log(`  ${bucket.label.padEnd(6)} ${pct(count, total).padStart(6)}  (${count})`)
}

const avgMs = activeMsList.reduce((a, b) => a + b, 0) / total
console.log(`\nMedian time-to-exit: ${(median(activeMsList) / 1000).toFixed(1)}s   Average: ${(avgMs / 1000).toFixed(1)}s`)

const engagedCount = sessions.filter((p) => typeof p.finalLevel === 'number' && p.finalLevel >= 3).length
console.log(`Reached "engaged" (Level 3 — 10s+ active & 2+ interactions): ${pct(engagedCount, total)} (${engagedCount}/${total})`)

const avgInteractions = sessions.reduce((a, p) => a + (typeof p.interactionCount === 'number' ? p.interactionCount : 0), 0) / total
console.log(`Average interactions per session: ${avgInteractions.toFixed(1)}`)

console.log('\nExit reason breakdown:')
const reasonCounts = {}
for (const p of sessions) reasonCounts[p.reason ?? 'unknown'] = (reasonCounts[p.reason ?? 'unknown'] ?? 0) + 1
for (const [reason, count] of Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${reason.padEnd(18)} ${pct(count, total).padStart(6)}  (${count})`)
}

const ctr = opensSnap.size === 0 ? 0 : clicksSnap.size / opensSnap.size
console.log(`\nOutbound click-through: ${(ctr * 100).toFixed(1)}% of opens (${clicksSnap.size}/${opensSnap.size})`)

console.log('\nSuggestions:')
const under2sCount = activeMsList.filter((ms) => ms < 2000).length
const under2sRate = under2sCount / total
if (under2sRate > 0.3) {
  console.log(
    `  - ${pct(under2sCount, total)} of sessions exit in the first 2 seconds. That usually means the opening\n    frame isn't reading as "a real playable game" fast enough — show actual gameplay in\n    frame 1 instead of a logo/loading/menu screen.`,
  )
}
if (engagedCount / total < 0.2 && under2sRate < 0.3) {
  console.log(
    `  - Most sessions survive past the first couple seconds, but few reach real engagement\n    (${pct(engagedCount, total)}). The hook is working — the core loop or CTA may not be obvious\n    once they're in it.`,
  )
}
if (engagedCount > 0 && ctr < 0.15) {
  console.log(
    `  - Only ${(ctr * 100).toFixed(1)}% of opens click through, even with ${pct(engagedCount, total)} reaching engagement.\n    Consider a clearer/earlier call-to-action inside the playable itself.`,
  )
}
if (under2sRate <= 0.3 && !(engagedCount / total < 0.2 && under2sRate < 0.3) && !(engagedCount > 0 && ctr < 0.15)) {
  console.log('  - No obvious red flag in this snapshot — funnel looks healthy relative to the heuristics above.')
}

console.log('\n' + '='.repeat(64))
