import { useEffect } from 'react'
import { useRouter } from '../router/router'
import { getLocalCreativeById } from '../services/creatives/localCreativeRegistry'
import { getLastFetchedCreativeById } from '../services/feed/feedService'
import { Thumbnail } from '../components/Thumbnail'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'

/**
 * The `Open Game Page` CTA target — reached only after
 * outboundClickGatekeeper.evaluateOutboundClick already ran and allowed
 * the tap (see FeedCardStack.tsx), so nothing here re-checks fraud/caps.
 *
 * `local-fake-detail` (TEST mode creatives) shows the in-app placeholder
 * below. `external` (Phase 2 real creatives — network or promo) redirects
 * straight to the real store/partner URL instead — no placeholder to show.
 */
export function GameDetailScreen({ creativeId }: { creativeId: string }) {
  const { back } = useRouter()
  // getLocalCreativeById only ever finds the 3 built-in local_test demos;
  // a Firebase-sourced creative (Phase 2) is looked up from the feed this
  // app already fetched instead of re-fetching it here.
  const creative = getLocalCreativeById(creativeId) ?? getLastFetchedCreativeById(creativeId)
  const isExternal = creative?.cta.kind === 'external'

  useEffect(() => {
    if (!creative || creative.cta.kind !== 'external') return
    // Plain window.open — works in any WebView without a native plugin.
    // Upgrading to @capacitor/browser's in-app browser tab is a nice-to-have
    // later, not required for this to work correctly.
    window.open(creative.cta.value, '_blank', 'noopener')
  }, [creative])

  if (!creative) {
    return (
      <div className="screen">
        <div className="screen-header">
          <button className="icon-button tap-target" onClick={back} aria-label="Back">
            ←
          </button>
        </div>
        <EmptyState glyph="🧩" title="Game page not found" body="This creative is missing or malformed." />
      </div>
    )
  }

  if (isExternal) {
    return (
      <div className="screen">
        <div className="screen-header">
          <button className="icon-button tap-target" onClick={back} aria-label="Back">
            ←
          </button>
          <h1 className="screen-header__title">Opening {creative.title}…</h1>
        </div>
        <EmptyState
          glyph="🔗"
          title="Opened in a new tab"
          body="If nothing happened, your browser may have blocked the pop-up."
          action={<Button onClick={back}>Back to feed</Button>}
        />
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="icon-button tap-target" onClick={back} aria-label="Back">
          ←
        </button>
        <h1 className="screen-header__title">Game Page</h1>
      </div>
      <div className="screen__scroll">
        <div className="fake-detail__hero">
          <Thumbnail thumbnail={creative.thumbnail} title={creative.title} />
        </div>
        <h2 style={{ margin: '0 0 4px' }}>{creative.title}</h2>
        <p style={{ color: 'var(--color-text-dim)', textTransform: 'capitalize', marginTop: 0 }}>
          {creative.genre}
          {creative.partnerLabel ? ` · ${creative.partnerLabel}` : ''}
        </p>
        <div className="prose">
          <p>
            This is a local placeholder detail page shown in TEST mode. In production, this CTA
            opens the game's real store listing or partner landing page instead — through the
            same outbound click gatekeeper.
          </p>
        </div>
        <Button variant="secondary" block onClick={back} style={{ marginTop: 16 }}>
          Back to feed
        </Button>
      </div>
    </div>
  )
}
