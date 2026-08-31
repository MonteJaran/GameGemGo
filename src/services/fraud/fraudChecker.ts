import type { EngagementStats } from '../../types/qualification'

/**
 * Behavior SCORING, not a single yes/no rule — several weak-to-strong
 * signals accumulate into one suspicion score, plus a few conditions that
 * hard-block outright regardless of score. Mirrors the "CLICK / PRESS
 * CHECKER" section of the spec. Used by outboundClickGatekeeper.ts.
 */

export interface FraudSignalInput {
  isForeground: boolean
  /** ms since playable_open, or null when there was no playable session at all (direct "Open Game Page" tap from the feed card). */
  msSincePlayableOpen: number | null
  stats: EngagementStats | null
  outboundClicksTodayForCreative: number
  outboundClicksTodayTotal: number
  recentOutboundClickTimestampsMs: number[]
}

export interface FraudScore {
  score: number
  reasons: string[]
  hardBlock: boolean
}

export const FRAUD_LIMITS = {
  /** "ultra-fast CTA presses immediately after open" */
  ultraFastPressMs: 1500,
  shortWindowMs: 60_000,
  maxOutboundInShortWindow: 3,
  maxOutboundPerCreativePerDay: 3,
  maxOutboundTotalPerDay: 10,
  blockScoreThreshold: 70,
  suspiciousScoreThreshold: 30,
} as const

export function scoreOutboundClick(input: FraudSignalInput): FraudScore {
  const reasons: string[] = []
  let score = 0
  let hardBlock = false

  // background/inactive app click attempts
  if (!input.isForeground) {
    score += 100
    reasons.push('background_or_inactive_app_click')
    hardBlock = true
  }

  // ultra-fast CTA presses immediately after open
  if (input.msSincePlayableOpen !== null && input.msSincePlayableOpen < FRAUD_LIMITS.ultraFastPressMs) {
    score += 45
    reasons.push('ultra_fast_cta_press')
  }

  // non-human repeated tap cadence / repeated identical timing patterns (from playableSessionManager's own detector)
  if (input.stats?.rapidRepeatSuspected) {
    score += 25
    reasons.push('non_human_repeat_tap_cadence')
  }

  // too many outbound clicks in a short period
  const recentInWindow = input.recentOutboundClickTimestampsMs.filter(
    (t) => Date.now() - t < FRAUD_LIMITS.shortWindowMs,
  ).length
  if (recentInWindow >= FRAUD_LIMITS.maxOutboundInShortWindow) {
    score += 30
    reasons.push('too_many_outbound_clicks_in_short_period')
  }

  // too many clicks on same creative per day (hard cap)
  if (input.outboundClicksTodayForCreative >= FRAUD_LIMITS.maxOutboundPerCreativePerDay) {
    score += 100
    reasons.push('same_creative_daily_cap_exceeded')
    hardBlock = true
  }

  // total daily cap
  if (input.outboundClicksTodayTotal >= FRAUD_LIMITS.maxOutboundTotalPerDay) {
    score += 100
    reasons.push('total_daily_cap_exceeded')
    hardBlock = true
  }

  return { score, reasons, hardBlock }
}
