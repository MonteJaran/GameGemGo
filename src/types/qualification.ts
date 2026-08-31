/**
 * 0 = nothing yet, 1 = impression, 2 = open, 3 = engaged preview,
 * 4 = outbound click candidate. See qualificationEngine.ts — this is a
 * CLIENT-SIDE CANDIDATE signal only, never a final revenue decision.
 */
export type QualificationLevel = 0 | 1 | 2 | 3 | 4

export interface EngagementStats {
  creativeId: string
  sessionId: string
  openedAt: number
  activeFocusedMs: number
  interactionCount: number
  isForeground: boolean
  /** true if interaction timing looks bot-like (near-zero variance) */
  rapidRepeatSuspected: boolean
}

export type GatekeeperDecision = 'allow' | 'allow_suspicious' | 'block'

export interface GatekeeperResult {
  decision: GatekeeperDecision
  reasonCode: string
  reasons: string[]
  suspicionScore: number
}
