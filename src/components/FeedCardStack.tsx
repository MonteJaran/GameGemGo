import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Creative } from '../types/creative'
import { FeedCard } from './FeedCard'
import { EmptyState } from './EmptyState'
import { Button } from './Button'
import { logEvent } from '../services/events/eventLogger'
import { evaluateOutboundClick } from '../services/fraud/outboundClickGatekeeper'
import { QUALIFICATION_THRESHOLDS } from '../services/qualification/qualificationEngine'
import { useRouter } from '../router/router'

const SWIPE_COMMIT_PX = 90
const SETTLE_MS = 220

/**
 * Vertical swipe feed. Drag is applied by mutating the top card's DOM
 * style directly (via cardRef) rather than through React state on every
 * pointermove — CSS transforms + no re-render per frame keeps this smooth
 * on mid-range hardware (spec: "Prefer CSS transforms and native scrolling
 * for smoothness").
 */
export function FeedCardStack({ creatives }: { creatives: Creative[] }) {
  const { navigate } = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [blockedNotice, setBlockedNotice] = useState<string | null>(null)
  const topCardEl = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ startY: number; dragging: boolean }>({ startY: 0, dragging: false })

  const current = creatives[currentIndex]
  const next = creatives[currentIndex + 1]
  const atEnd = !current

  // Level 1 impression: the card must stay the top/visible card for >= 2s uninterrupted.
  useEffect(() => {
    if (!current) return
    const timer = window.setTimeout(() => {
      logEvent('card_visible_2s', { creativeId: current.id })
    }, QUALIFICATION_THRESHOLDS.impressionMs)
    return () => window.clearTimeout(timer)
  }, [current])

  useEffect(() => {
    setBlockedNotice(null)
  }, [currentIndex])

  function settle(transform: string, transition: string) {
    const el = topCardEl.current
    if (!el) return
    el.style.transition = transition
    el.style.transform = transform
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    drag.current = { startY: e.clientY, dragging: true }
    settle('translateY(0px)', 'none')
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current.dragging) return
    const dy = e.clientY - drag.current.startY
    // Resist the downward "restore" gesture a bit more on the first card, where there's nothing to restore to.
    const damped = dy < 0 || currentIndex > 0 ? dy : dy * 0.35
    settle(`translateY(${damped}px)`, 'none')
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current.dragging) return
    const dy = e.clientY - drag.current.startY
    drag.current.dragging = false

    if (dy <= -SWIPE_COMMIT_PX) {
      commitSkip()
    } else if (dy >= SWIPE_COMMIT_PX && currentIndex > 0) {
      commitRestore()
    } else {
      settle('translateY(0px)', `transform ${SETTLE_MS}ms cubic-bezier(0.22,1,0.36,1)`)
    }
  }

  function commitSkip() {
    if (!current) return
    settle('translateY(-120%)', `transform ${SETTLE_MS}ms cubic-bezier(0.22,1,0.36,1)`)
    logEvent('card_skip', { creativeId: current.id })
    window.setTimeout(() => {
      setCurrentIndex((i) => i + 1)
    }, SETTLE_MS)
  }

  function commitRestore() {
    if (currentIndex === 0) return
    const previous = creatives[currentIndex - 1]
    settle('translateY(120%)', `transform ${SETTLE_MS}ms cubic-bezier(0.22,1,0.36,1)`)
    if (previous) logEvent('card_restore', { creativeId: previous.id })
    window.setTimeout(() => {
      setCurrentIndex((i) => Math.max(0, i - 1))
    }, SETTLE_MS)
  }

  function handleTry() {
    if (!current) return
    navigate({ name: 'play', creativeId: current.id })
  }

  function handleOpenGamePage() {
    if (!current) return
    // No open Playable session yet for this creative (direct tap from the
    // feed card) — the gatekeeper still runs, it just can't grant
    // revenue-eligibility without a qualified preview session.
    const decision = evaluateOutboundClick({ creativeId: current.id })
    if (decision.decision === 'block') {
      setBlockedNotice("Can't open this right now — try again in a moment.")
      return
    }
    navigate({ name: 'game', creativeId: current.id })
  }

  if (atEnd) {
    return (
      <div className="card-stack">
        <EmptyState
          glyph="🎉"
          title="You're all caught up"
          body="No more playable previews in this batch."
          action={
            <Button variant="primary" onClick={() => setCurrentIndex(0)}>
              Start over
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="card-stack">
      <div className="card-stack__inner">
        {next && (
          <FeedCard
            key={next.id}
            creative={next}
            interactive={false}
            blockedNotice={null}
            // pointerEvents: none — this peeking card sits behind the top
            // one and must never itself receive a tap (spec: "No
            // accidental click traps"), even at its slightly-exposed edges.
            style={{ transform: 'translateY(10px) scale(0.96)', opacity: 0.7, zIndex: 1, pointerEvents: 'none' }}
            onTry={() => {}}
            onOpenGamePage={() => {}}
          />
        )}
        <FeedCard
          key={current.id}
          creative={current}
          interactive
          blockedNotice={blockedNotice}
          cardRef={topCardEl}
          style={{ zIndex: 2 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onTry={handleTry}
          onOpenGamePage={handleOpenGamePage}
        />
      </div>
      {currentIndex > 0 && (
        <button className="restore-fab tap-target" onClick={commitRestore}>
          ↺ Previous
        </button>
      )}
      <p className="card-stack__hint">Swipe up to skip</p>
    </div>
  )
}
