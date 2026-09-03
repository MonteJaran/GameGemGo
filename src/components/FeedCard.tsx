import { useEffect, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, Ref } from 'react'
import type { Creative } from '../types/creative'
import { Thumbnail } from './Thumbnail'
import { getCachedPlayableHtml } from '../services/creatives/playableCache'

interface FeedCardProps {
  creative: Creative
  style: CSSProperties
  /** True only for the top/current card in the stack — the only one that ever runs a live playable. The peeking `next` card stays a static thumbnail (only one iframe mounted at a time). */
  interactive: boolean
  /** React 19 supports `ref` as a plain prop on function components — no forwardRef needed. Used by FeedCardStack to mutate transform directly during drag without a re-render per pointermove. */
  cardRef?: Ref<HTMLDivElement>
  onPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove?: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp?: (e: ReactPointerEvent<HTMLDivElement>) => void
}

/**
 * Purely presentational — FeedCardStack owns drag state/physics and the
 * playable session, and passes down a transform via `style`. Nothing here
 * but the game itself and, for a promo placement, the gold/emerald frame —
 * no badge, no title, no button, no text. `creative.internal` is
 * intentionally never read here: that metadata is for the Debug screen
 * only, not the feed UI.
 *
 * The only actions are swiping away — via the top/bottom edge zones below,
 * so gameplay touches in the middle of the card reach the iframe
 * untouched — or a plain tap (not a drag) on one of those same edge zones,
 * which FeedCardStack reads as "open the game page". The edge zones are
 * real DOM elements (not just a Y-coordinate check on a card-wide handler)
 * because once a pointer moves over a cross-origin sandboxed iframe, the
 * parent page stops receiving pointermove for it — capture has to start
 * on an element outside the iframe for the gesture to track reliably.
 */
export function FeedCard({ creative, style, interactive, cardRef, onPointerDown, onPointerMove, onPointerUp }: FeedCardProps) {
  const promoClass = creative.placement === 'promo' ? ` feed-card--promo-${creative.promoTier ?? 'gold'}` : ''

  return (
    <div ref={cardRef} className={`feed-card${promoClass}`} style={style}>
      <div className="feed-card__art">
        {interactive ? <LivePlayableFrame creative={creative} /> : <Thumbnail thumbnail={creative.thumbnail} title={creative.title} />}
      </div>

      {/* Edge swipe/tap handles — only on the live top card; the peeking card underneath must never receive a gesture of its own. */}
      {interactive && (
        <>
          <div
            className="feed-card__swipe-zone feed-card__swipe-zone--top"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <div
            className="feed-card__swipe-zone feed-card__swipe-zone--bottom"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </>
      )}
    </div>
  )
}

/**
 * Prefers a background-prefetched copy (see services/creatives/playableCache.ts
 * and useFeed.ts, which kicks the prefetch off for the whole feed as soon
 * as it loads) so the game is already local — no network wait, works
 * offline — by the time its card becomes current. `srcDoc` renders that
 * cached HTML directly; falls back to a live `src` fetch (today's
 * behavior) until/unless a cached copy shows up, so a card is never stuck
 * empty just because prefetching hasn't finished yet.
 */
function LivePlayableFrame({ creative }: { creative: Creative }) {
  const { kind, entry } = creative.playable
  const [cachedHtml, setCachedHtml] = useState<string | null>(null)

  useEffect(() => {
    setCachedHtml(null)
    if (kind !== 'remote') return
    let cancelled = false
    void getCachedPlayableHtml(entry).then((html) => {
      if (!cancelled) setCachedHtml(html)
    })
    return () => {
      cancelled = true
    }
  }, [kind, entry])

  const title = `${creative.title} playable`
  // allow-scripts only, deliberately no allow-same-origin: our own demos
  // don't need it, and this is the same sandboxing a remote/partner or
  // promo playable (still untrusted content) must use too.
  return cachedHtml ? (
    <iframe key={creative.id} srcDoc={cachedHtml} title={title} sandbox="allow-scripts" className="feed-card__frame" />
  ) : (
    <iframe key={creative.id} src={entry} title={title} sandbox="allow-scripts" className="feed-card__frame" />
  )
}
