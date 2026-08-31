import { useEffect, useState } from 'react'
import { useRouter } from '../router/router'
import { usePlayableSession } from '../hooks/usePlayableSession'
import { getLocalCreativeById } from '../services/creatives/localCreativeRegistry'
import { evaluateOutboundClick } from '../services/fraud/outboundClickGatekeeper'
import { QUALIFICATION_THRESHOLDS } from '../services/qualification/qualificationEngine'
import { EmptyState } from '../components/EmptyState'
import { Button } from '../components/Button'

/** Must match the message `type` the bundled demo HTML files postMessage() to the parent on every meaningful game input. */
const INTERACTION_MESSAGE_TYPE = 'swipeplayable:interaction'

export function PlayablePreviewScreen({ creativeId }: { creativeId: string }) {
  const { back, navigate } = useRouter()
  // Phase 1: local registry only. Phase 2 TODO: also try the last-fetched
  // Firebase creative list (feedService) before falling back to "not found".
  const creative = getLocalCreativeById(creativeId)
  const session = usePlayableSession(creativeId)
  const [, forceTick] = useState(0)
  const [outboundNotice, setOutboundNotice] = useState<string | null>(null)

  // Listen for interaction pings from the sandboxed demo iframe.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data as { type?: string } | undefined
      if (data?.type !== INTERACTION_MESSAGE_TYPE) return
      session?.recordInteraction()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [session])

  // Cheap 500ms UI refresh so the "active seconds" readout and Engaged
  // badge update without re-deriving state on every render.
  useEffect(() => {
    if (!session) return
    const interval = window.setInterval(() => forceTick((n) => n + 1), 500)
    return () => window.clearInterval(interval)
  }, [session])

  function handleBack() {
    session?.end('user_back')
    back()
  }

  function handleOpenGamePage() {
    if (!session) return
    const stats = session.getStats()
    const decision = evaluateOutboundClick({ creativeId, session: { stats, openedAt: stats.openedAt } })
    if (decision.decision === 'block') {
      setOutboundNotice("Can't open this right now — try again in a moment.")
      return
    }
    session.end('completed')
    navigate({ name: 'game', creativeId })
  }

  if (!creative) {
    return (
      <div className="screen">
        <div className="preview-header">
          <button className="icon-button tap-target" onClick={handleBack} aria-label="Back">
            ←
          </button>
        </div>
        <EmptyState
          glyph="🧩"
          title="Playable not found"
          body="This creative is missing or malformed."
          action={<Button onClick={handleBack}>Back to feed</Button>}
        />
      </div>
    )
  }

  const stats = session?.getStats()
  const activeSeconds = stats ? stats.activeFocusedMs / 1000 : 0
  const engaged = stats
    ? stats.activeFocusedMs >= QUALIFICATION_THRESHOLDS.engagedActiveMs &&
      stats.interactionCount >= QUALIFICATION_THRESHOLDS.engagedMinInteractions
    : false

  return (
    <div className="screen">
      <div className="preview-header">
        <button className="icon-button tap-target" onClick={handleBack} aria-label="Back">
          ←
        </button>
        <span className="preview-header__title">{creative.title}</span>
      </div>

      {/* No ad overlay is ever rendered over this stage during active play. */}
      <div className="preview-stage">
        <iframe
          src={creative.playable.entry}
          title={`${creative.title} playable preview`}
          // allow-scripts only, deliberately no allow-same-origin: our own
          // demos don't need it, and this is the same sandboxing a Phase 2
          // remote/partner playable (untrusted content) must use too.
          sandbox="allow-scripts"
        />
      </div>

      <div className="preview-footer">
        <div className="preview-progress">
          <span>
            {activeSeconds.toFixed(0)}s active · {stats?.interactionCount ?? 0} interactions
          </span>
          <span>{engaged ? 'Engaged ✓' : 'Keep playing…'}</span>
        </div>
        <Button variant="primary" block onClick={handleOpenGamePage} className="tap-target">
          Open Game Page
        </Button>
        {outboundNotice && <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: 0 }}>{outboundNotice}</p>}
      </div>
    </div>
  )
}
