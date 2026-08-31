import { useRouter } from '../router/router'
import { getLocalCreativeById } from '../services/creatives/localCreativeRegistry'
import { Thumbnail } from '../components/Thumbnail'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'

/**
 * The `local-fake-detail` CTA target for TEST mode creatives. Phase 2's
 * `external` CTA kind instead opens the real store/partner URL (still
 * through the outbound click gatekeeper) — this screen simply won't be
 * reached for those.
 */
export function GameDetailScreen({ creativeId }: { creativeId: string }) {
  const { back } = useRouter()
  const creative = getLocalCreativeById(creativeId)

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
