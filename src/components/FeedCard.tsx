import type { CSSProperties, PointerEvent as ReactPointerEvent, Ref } from 'react'
import type { Creative } from '../types/creative'
import { Thumbnail } from './Thumbnail'
import { Badge } from './Badge'
import { Button } from './Button'

interface FeedCardProps {
  creative: Creative
  style: CSSProperties
  interactive: boolean
  blockedNotice: string | null
  /** React 19 supports `ref` as a plain prop on function components — no forwardRef needed. Used by FeedCardStack to mutate transform directly during drag without a re-render per pointermove. */
  cardRef?: Ref<HTMLDivElement>
  onPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove?: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp?: (e: ReactPointerEvent<HTMLDivElement>) => void
  onTry: () => void
  onOpenGamePage: () => void
}

/**
 * Purely presentational — FeedCardStack owns drag state/physics and passes
 * down a transform via `style`. `creative.internal` is intentionally never
 * read here: that metadata is for the Debug screen only, not the feed UI.
 */
export function FeedCard({
  creative,
  style,
  interactive,
  blockedNotice,
  cardRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onTry,
  onOpenGamePage,
}: FeedCardProps) {
  return (
    <div
      ref={cardRef}
      className="feed-card"
      style={style}
      onPointerDown={interactive ? onPointerDown : undefined}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? onPointerUp : undefined}
      onPointerCancel={interactive ? onPointerUp : undefined}
    >
      <div className="feed-card__art">
        <Thumbnail thumbnail={creative.thumbnail} title={creative.title} />
      </div>
      <div className="feed-card__body">
        <Badge>{creative.badgeLabel}</Badge>
        <h2 className="feed-card__title">{creative.title}</h2>
        <div className="feed-card__meta">
          <span>{creative.genre}</span>
          {creative.partnerLabel && <span className="feed-card__partner">· {creative.partnerLabel}</span>}
        </div>
        <div className="feed-card__actions">
          <Button variant="primary" block onClick={onTry} className="tap-target">
            Try
          </Button>
          <Button variant="secondary" block onClick={onOpenGamePage} className="tap-target">
            Open Game Page
          </Button>
        </div>
        {blockedNotice && (
          <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: 0 }}>{blockedNotice}</p>
        )}
      </div>
    </div>
  )
}
