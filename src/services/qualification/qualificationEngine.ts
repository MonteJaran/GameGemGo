import type { EngagementStats, QualificationLevel } from '../../types/qualification'

/**
 * CLIENT-SIDE CANDIDATE LOGIC ONLY.
 *
 * Everything in this file decides what the *client thinks* the engagement
 * level is, purely to drive UI/logging and the outbound click gatekeeper's
 * local pre-check. It is NOT a monetization decision. In Phase 2, raw
 * events reach Cloud Functions (see firebase/functions/src/qualifyEvents.ts
 * skeleton) which independently recompute the same levels server-side from
 * server timestamps — only that server computation may ever mark an event
 * as revenue-eligible in `qualified_events`.
 */
export const QUALIFICATION_THRESHOLDS = {
  /** Level 1: impression */
  impressionMs: 2000,
  /** Level 3: engaged preview */
  engagedActiveMs: 10000,
  engagedMinInteractions: 2,
} as const

/** Level 0/1 aren't representable by EngagementStats (that only exists once a playable is open, i.e. Level 2) — this resolves Level 2 vs Level 3. */
export function computeLevel(stats: EngagementStats): QualificationLevel {
  const engaged =
    stats.activeFocusedMs >= QUALIFICATION_THRESHOLDS.engagedActiveMs &&
    stats.interactionCount >= QUALIFICATION_THRESHOLDS.engagedMinInteractions &&
    stats.isForeground &&
    !stats.rapidRepeatSuspected
  return engaged ? 3 : 2
}

export function hasReachedEngagedPreview(stats: EngagementStats): boolean {
  return computeLevel(stats) >= 3
}
