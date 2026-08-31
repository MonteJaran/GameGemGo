import { env } from '../../config/env'
import { logEvent } from '../events/eventLogger'
import { hasReachedEngagedPreview } from '../qualification/qualificationEngine'
import { scoreOutboundClick, FRAUD_LIMITS } from './fraudChecker'
import { recordOutboundClick, getOutboundClickCountsToday } from './clickHistoryStore'
import type { EngagementStats, GatekeeperDecision, GatekeeperResult } from '../../types/qualification'

export interface OutboundClickRequest {
  creativeId: string
  /** Present only when navigating out of an open Playable Preview session; absent for a direct "Open Game Page" tap on the feed card. */
  session?: { stats: EngagementStats; openedAt: number }
}

export interface OutboundClickDecision extends GatekeeperResult {
  /** Only true if a Playable Preview session reached Level 3 (engaged preview) — see QUALIFICATION LOGIC in the spec. In local_test this is the final word; in staging/production it's superseded by the server's own verdict (see confirmWithServer below) once that resolves. */
  revenueEligible: boolean
}

/**
 * The single choke point every "open external game page" action must pass
 * through — the feed card's CTA and the Playable Preview screen's CTA both
 * call this before navigating anywhere. Never bypass it with a direct
 * `navigate()`/`window.open()` call.
 *
 * Stays synchronous on purpose (navigation UX shouldn't wait on a network
 * round trip) — outside local_test it also kicks off an async, fire-and-
 * forget server confirmation (see confirmWithServer). That call, not this
 * function's return value, is what's actually authoritative for
 * revenue-eligibility once it resolves; this local pass only ever
 * controls whether the app navigates right now.
 */
export function evaluateOutboundClick(req: OutboundClickRequest): OutboundClickDecision {
  const isForeground = document.visibilityState === 'visible'
  const msSincePlayableOpen = req.session ? Date.now() - req.session.openedAt : null
  const { forCreativeToday, totalToday, recentTimestamps } = getOutboundClickCountsToday(req.creativeId)

  const { score, reasons, hardBlock } = scoreOutboundClick({
    isForeground,
    msSincePlayableOpen,
    stats: req.session?.stats ?? null,
    outboundClicksTodayForCreative: forCreativeToday,
    outboundClicksTodayTotal: totalToday,
    recentOutboundClickTimestampsMs: recentTimestamps,
  })

  const revenueEligible = Boolean(req.session && hasReachedEngagedPreview(req.session.stats))

  let decision: GatekeeperDecision
  if (hardBlock || score >= FRAUD_LIMITS.blockScoreThreshold) {
    decision = 'block'
  } else if (score >= FRAUD_LIMITS.suspiciousScoreThreshold) {
    decision = 'allow_suspicious'
  } else {
    decision = 'allow'
  }

  const result: OutboundClickDecision = {
    decision,
    reasonCode: reasons[0] ?? 'ok',
    reasons,
    suspicionScore: score,
    revenueEligible,
  }

  // Log every decision, not just the interesting ones.
  const logPayload: Record<string, unknown> = { ...result }
  if (decision === 'block') {
    logEvent('blocked_click', { creativeId: req.creativeId, payload: logPayload })
  } else {
    if (decision === 'allow_suspicious') {
      logEvent('suspicious_click_pattern', { creativeId: req.creativeId, payload: logPayload })
    }
    logEvent('outbound_click', { creativeId: req.creativeId, payload: logPayload })
    recordOutboundClick(req.creativeId)

    // Only worth confirming with the server when the local pass would
    // otherwise let the user through — a local block already stops
    // navigation, no need to also hit the network for it.
    if (!env.isLocalTest) {
      void confirmWithServer(req, isForeground)
    }
  }

  return result
}

interface ServerDecision {
  decision: GatekeeperDecision
  reasons: string[]
  revenueEligible: boolean
}

/**
 * Fire-and-forget authoritative re-check. Runs the same shape of scoring
 * server-side (firebase/functions/src/fraudScoring.ts) against
 * server-held daily counters and a server-rebuilt session — the client's
 * local caps and session stats above are just a fast, offline-friendly
 * first pass and can't be fully trusted (localStorage is trivially
 * clearable). The server call also writes to fraud_flags itself when
 * warranted, so there's nothing further for the client to do with the
 * result besides logging it for the Debug screen.
 */
async function confirmWithServer(req: OutboundClickRequest, isForeground: boolean) {
  try {
    const [{ getFirebaseFunctions }, { httpsCallable }] = await Promise.all([
      import('../firebase/firebaseClient'),
      import('firebase/functions'),
    ])
    const callable = httpsCallable<
      { creativeId: string; sessionId?: string; isForeground: boolean },
      ServerDecision
    >(getFirebaseFunctions(), 'evaluateOutboundClickServer')

    const { data } = await callable({
      creativeId: req.creativeId,
      sessionId: req.session?.stats.sessionId,
      isForeground,
    })

    logEvent('outbound_click', {
      creativeId: req.creativeId,
      payload: { source: 'server_confirmation', ...data },
    })
    if (data.decision !== 'allow') {
      logEvent('suspicious_click_pattern', {
        creativeId: req.creativeId,
        payload: { source: 'server_confirmation', ...data },
      })
    }
  } catch (err) {
    // FAILSAFE: never throw out of a fire-and-forget call. An unconfirmed
    // click just stays unconfirmed rather than crashing anything visible.
    console.warn('[outboundClickGatekeeper] Server confirmation failed.', err)
  }
}
