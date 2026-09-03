import { logEvent } from '../events/eventLogger'
import { computeLevel, hasReachedEngagedPreview, QUALIFICATION_THRESHOLDS } from '../qualification/qualificationEngine'
import type { EngagementStats, QualificationLevel } from '../../types/qualification'
import { newId } from '../../utils/id'

export type ExitReason = 'user_back' | 'app_backgrounded' | 'completed' | 'card_skip' | 'card_restore' | 'unknown'

/** Must match the message `type` every bundled/remote demo HTML file postMessage()s to the parent on every meaningful game input — see /public/demos/*\/index.html. Whoever is running the live iframe (FeedCardStack, one at a time) listens for this and forwards to that card's session.recordInteraction(). */
export const INTERACTION_MESSAGE_TYPE = 'swipeplayable:interaction'

export interface PlayableSession {
  sessionId: string
  getStats(): EngagementStats
  getLevel(): QualificationLevel
  recordInteraction(): void
  end(reason: ExitReason): void
}

const CHECK_INTERVAL_MS = 1000
/** Faster than this between taps reads as scripted input, not a human finger. */
const MIN_PLAUSIBLE_TAP_INTERVAL_MS = 40
/** Near-zero jitter across several taps also reads as scripted/bot cadence. */
const RAPID_REPEAT_STDDEV_MS = 15

function detectRapidRepeat(timestamps: number[]): boolean {
  if (timestamps.length < 3) return false
  const intervals: number[] = []
  for (let i = 1; i < timestamps.length; i++) intervals.push(timestamps[i] - timestamps[i - 1])
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length
  if (mean < MIN_PLAUSIBLE_TAP_INTERVAL_MS) return true
  const variance = intervals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / intervals.length
  const stdDev = Math.sqrt(variance)
  return stdDev < RAPID_REPEAT_STDDEV_MS && mean < 500
}

/**
 * Owns one Playable Preview session's lifecycle: active focused time
 * (paused whenever the tab/app isn't visible), interaction count, rapid-tap
 * detection, and the Level 1-4 qualification events. One instance per
 * feed card that reaches the top of the stack — see FeedCardStack.tsx and
 * hooks/usePlayableSession.ts.
 */
export function createPlayableSession(creativeId: string): PlayableSession {
  const sessionId = newId('play')
  const openedAt = Date.now()
  let activeFocusedMs = 0
  let focusStartedAt: number | null = document.visibilityState === 'visible' ? Date.now() : null
  let interactionCount = 0
  const interactionTimestamps: number[] = []
  let rapidRepeatSuspected = false
  let ended = false
  let firedActive10s = false
  let firedInteraction2 = false
  let firedQualified = false

  logEvent('playable_open', { creativeId, payload: { sessionId } })
  if (focusStartedAt !== null) logEvent('playable_focus_start', { creativeId, payload: { sessionId } })

  function flushFocus() {
    if (focusStartedAt !== null) {
      activeFocusedMs += Date.now() - focusStartedAt
      focusStartedAt = null
    }
  }

  function onVisibilityChange() {
    if (ended) return
    if (document.visibilityState === 'visible') {
      focusStartedAt = Date.now()
      logEvent('playable_focus_start', { creativeId, payload: { sessionId } })
    } else {
      flushFocus()
      logEvent('playable_focus_end', { creativeId, payload: { sessionId, activeFocusedMs, paused: true } })
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  function currentActiveMs(): number {
    return activeFocusedMs + (focusStartedAt !== null ? Date.now() - focusStartedAt : 0)
  }

  function getStats(): EngagementStats {
    return {
      creativeId,
      sessionId,
      openedAt,
      activeFocusedMs: currentActiveMs(),
      interactionCount,
      isForeground: document.visibilityState === 'visible',
      rapidRepeatSuspected,
    }
  }

  function getLevel(): QualificationLevel {
    return computeLevel(getStats())
  }

  function checkThresholds() {
    const stats = getStats()
    if (!firedActive10s && stats.activeFocusedMs >= QUALIFICATION_THRESHOLDS.engagedActiveMs) {
      firedActive10s = true
      logEvent('active_10s', { creativeId, payload: { sessionId } })
    }
    if (!firedInteraction2 && stats.interactionCount >= QUALIFICATION_THRESHOLDS.engagedMinInteractions) {
      firedInteraction2 = true
      logEvent('interaction_count_2', { creativeId, payload: { sessionId } })
    }
    if (!firedQualified && hasReachedEngagedPreview(stats)) {
      firedQualified = true
      logEvent('qualified_engagement_candidate', {
        creativeId,
        payload: { sessionId, activeFocusedMs: stats.activeFocusedMs, interactionCount: stats.interactionCount },
      })
    }
  }

  const intervalId = window.setInterval(() => {
    if (!ended) checkThresholds()
  }, CHECK_INTERVAL_MS)

  function recordInteraction() {
    if (ended) return
    const now = Date.now()
    interactionCount += 1
    interactionTimestamps.push(now)
    if (interactionTimestamps.length > 6) interactionTimestamps.shift()
    rapidRepeatSuspected = detectRapidRepeat(interactionTimestamps)
    logEvent('playable_interaction', { creativeId, payload: { sessionId, interactionCount } })
    if (rapidRepeatSuspected) {
      logEvent('suspicious_repeat_pattern', { creativeId, payload: { sessionId, interactionTimestamps: [...interactionTimestamps] } })
    }
    checkThresholds()
  }

  function end(reason: ExitReason) {
    if (ended) return
    ended = true
    flushFocus()
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.clearInterval(intervalId)
    logEvent('playable_focus_end', {
      creativeId,
      payload: { sessionId, reason, activeFocusedMs, interactionCount, finalLevel: computeLevel(getStats()) },
    })
  }

  return { sessionId, getStats, getLevel, recordInteraction, end }
}
