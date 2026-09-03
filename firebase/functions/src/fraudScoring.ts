import './admin.js'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { computeSessionStats } from './sessionStats.js'
import { bumpPromoCounter } from './promoSpendGuard.js'

// Mirrors src/services/fraud/fraudChecker.ts's FRAUD_LIMITS — keep in sync by hand.
export const FRAUD_LIMITS = {
  ultraFastPressMs: 1500,
  maxOutboundPerCreativePerDay: 3,
  maxOutboundTotalPerDay: 10,
  blockScoreThreshold: 70,
  suspiciousScoreThreshold: 30,
  engagedActiveMs: 10000,
  engagedMinInteractions: 2,
} as const

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

/**
 * THE authoritative outbound-click re-validation. The client's
 * outboundClickGatekeeper.ts decision is advisory only — this callable is
 * what's actually allowed to grant revenue-eligibility and write to
 * fraud_flags. Daily caps live in a server-only `counters` doc
 * (incremented atomically in a transaction), so they can't be reset by
 * clearing local app storage the way the client's own soft cap can.
 *
 * Known limitation: `isForeground` is inherently a client-reported signal
 * — a WebView has no way for the server to independently observe it. It's
 * used as one input among several, and everything else (session stats,
 * daily caps, session open time) is reconstructed/held server-side and
 * NOT trusted from the client.
 */
export const evaluateOutboundClickServer = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign-in required.')
  }
  const uid = request.auth.uid

  const { creativeId, sessionId, isForeground } = (request.data ?? {}) as Record<string, unknown>
  if (typeof creativeId !== 'string' || creativeId.length === 0 || creativeId.length > 128) {
    throw new HttpsError('invalid-argument', 'Missing or malformed creativeId.')
  }
  // sessionId is optional — absent for a direct "Open Game Page" tap from
  // the feed card, where no playable session was ever opened.
  const sid = typeof sessionId === 'string' && sessionId.length > 0 ? sessionId : null

  const db = getFirestore()

  // Internal/QA traffic: never revenue-eligible, never worth fraud-flagging.
  const userSnap = await db.collection('users').doc(uid).get()
  const isInternalTestUser = userSnap.exists && userSnap.data()?.isInternalTestUser === true

  const stats = sid ? await computeSessionStats(sid) : null
  const revenueEligible =
    !isInternalTestUser &&
    stats !== null &&
    stats.activeFocusedMs >= FRAUD_LIMITS.engagedActiveMs &&
    stats.interactionCount >= FRAUD_LIMITS.engagedMinInteractions &&
    !stats.hasRapidRepeatFlag

  // --- Server-held daily counters, incremented atomically ---
  const day = todayKey()
  const counterRef = db.collection('counters').doc(`${uid}_${day}`)

  const { forCreativeToday, totalToday } = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef)
    const data = snap.exists ? (snap.data() as { total?: number; perCreative?: Record<string, number> }) : {}
    const total = data.total ?? 0
    const perCreative = data.perCreative ?? {}
    const forCreative = perCreative[creativeId] ?? 0

    const alreadyOverCap =
      forCreative >= FRAUD_LIMITS.maxOutboundPerCreativePerDay || total >= FRAUD_LIMITS.maxOutboundTotalPerDay

    // Only count this attempt toward the running totals if it wasn't
    // already over cap — an attempt that gets hard-blocked for exceeding
    // the cap shouldn't push the counters further past it.
    if (!alreadyOverCap) {
      tx.set(
        counterRef,
        {
          total: FieldValue.increment(1),
          [`perCreative.${creativeId}`]: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
    }

    return { forCreativeToday: forCreative, totalToday: total }
  })

  // --- Scoring (mirrors src/services/fraud/fraudChecker.ts) ---
  const reasons: string[] = []
  let score = 0
  let hardBlock = false

  if (isForeground === false) {
    score += 100
    hardBlock = true
    reasons.push('background_or_inactive_app_click')
  }

  if (stats?.openedAtMs !== null && stats?.openedAtMs !== undefined) {
    const msSincePlayableOpen = Date.now() - stats.openedAtMs
    if (msSincePlayableOpen < FRAUD_LIMITS.ultraFastPressMs) {
      score += 45
      reasons.push('ultra_fast_cta_press')
    }
  }

  if (stats?.hasRapidRepeatFlag) {
    score += 25
    reasons.push('non_human_repeat_tap_cadence')
  }

  if (forCreativeToday >= FRAUD_LIMITS.maxOutboundPerCreativePerDay) {
    score += 100
    hardBlock = true
    reasons.push('same_creative_daily_cap_exceeded')
  }
  if (totalToday >= FRAUD_LIMITS.maxOutboundTotalPerDay) {
    score += 100
    hardBlock = true
    reasons.push('total_daily_cap_exceeded')
  }

  const decision =
    hardBlock || score >= FRAUD_LIMITS.blockScoreThreshold
      ? 'block'
      : score >= FRAUD_LIMITS.suspiciousScoreThreshold
        ? 'allow_suspicious'
        : 'allow'

  if (decision !== 'allow') {
    await db.collection('fraud_flags').add({
      uid,
      sessionId: sid,
      creativeId,
      score,
      reasons,
      decision,
      createdAt: FieldValue.serverTimestamp(),
    })
  }

  // Promo (prepaid sponsor) billing: only a click that survives fraud
  // scoring draws down a campaign's prepaid balance — a blocked click
  // never reaches here, so bad traffic can't drain a sponsor's budget.
  // No-ops instantly for a non-promo creative (see bumpPromoCounter).
  if (decision !== 'block') {
    await bumpPromoCounter(creativeId, 'clicksCount')
  }

  return {
    decision,
    reasons,
    revenueEligible: decision === 'block' ? false : revenueEligible,
  }
})
