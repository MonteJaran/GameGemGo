import type { EnvironmentMode } from './environment'

/**
 * The full event vocabulary from the product spec. Keeping this as one
 * union (instead of free-form strings) means a typo can't silently create a
 * new, unqualified event name.
 */
export type EventName =
  | 'app_open'
  | 'feed_rendered'
  | 'card_visible_2s'
  | 'card_skip'
  | 'card_restore'
  | 'playable_open'
  | 'playable_focus_start'
  | 'playable_focus_end'
  | 'playable_interaction'
  | 'active_10s'
  | 'interaction_count_2'
  | 'qualified_engagement_candidate'
  | 'outbound_click'
  | 'suspicious_click_pattern'
  | 'suspicious_repeat_pattern'
  | 'blocked_click'
  | 'internal_test_user'

export interface TrackedEvent {
  id: string
  name: EventName
  /** Client epoch ms. Never trusted as-is for anything monetization-related — a server timestamp is authoritative once events reach Firebase (Phase 2). */
  ts: number
  sessionId: string
  userId: string
  environment: EnvironmentMode
  creativeId?: string
  payload?: Record<string, unknown>
}
