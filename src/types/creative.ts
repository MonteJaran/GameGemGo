import type { EnvironmentMode } from './environment'

export type CreativeGenre = 'runner' | 'puzzle' | 'strategy'

/**
 * Fields the feed card / preview screen is allowed to render. This mirrors
 * the future Firestore split: this shape is what `ad_creatives_public`
 * will expose to a read-only client (see firebase/firestore.rules and
 * FIREBASE_SCHEMA.md). Nothing monetization-sensitive belongs here.
 */
export interface CreativePublic {
  id: string
  title: string
  genre: CreativeGenre
  /**
   * Local seed creatives use a genre-driven gradient (no image asset to go
   * missing). Phase 2 remote creatives can carry a real `image` URL — the
   * Thumbnail component falls back to the gradient+glyph automatically if
   * that URL 404s or fails to decode, so a broken remote thumbnail never
   * breaks the card.
   */
  thumbnail:
    | { kind: 'placeholder-gradient'; from: string; to: string; glyph: string }
    | { kind: 'image'; url: string; from: string; to: string; glyph: string }
  badgeLabel: 'Playable Preview'
  partnerLabel?: string
  /**
   * 'network' (default when absent) = ordinary ad-network inventory, revenue
   * comes from qualified engagements/outbound clicks as usual. 'promo' =
   * a manually configured, prepaid sponsor placement (see
   * firebase/FIREBASE_SCHEMA.md) — never bundled into the app, `playable`
   * below is still just a URL you host, same rendering pipeline, just
   * sorted first and given a gold/emerald frame. The client never sees
   * *why* (prepaid amount, rate card, spend) — only this flag and the
   * tier, both purely presentational here.
   *
   * 'featured' = the operator's own curated/bundled filler creative — not
   * ad-network inventory, not paid, no money fields exist for it at all.
   * Exists purely to pad out the catalog (so the feed doesn't look thin to
   * a Play Store reviewer). Rendered and tracked *exactly* like a
   * `network` creative — same plain framing, same engagement/click
   * accounting, no promo billing hook ever fires for it (that hook checks
   * `placement === 'promo'` specifically, see promoSpendGuard.ts) — the
   * only thing that differs is feed position: `feedService.ts` drops each
   * `featured` creative at a random index among the `network` ones on
   * every load instead of leaving it in source order.
   */
  placement?: 'network' | 'promo' | 'featured'
  promoTier?: 'gold' | 'emerald'
  /** Ordering among multiple simultaneous promo placements only (higher first) — not a ranking/quality signal, so unlike `qualityScore` it's fine to expose. Ignored for `network`/`featured` creatives — a `featured` creative's position is randomized instead, see `placement` above. */
  priority?: number
  playable: {
    /** local = bundled demo html under /public/demos. remote = Phase 2 (Firebase-hosted or partner URL), loaded the same way (iframe). */
    kind: 'local' | 'remote'
    entry: string
  }
  cta: {
    /** local-fake-detail = in-app placeholder page. external = Phase 2 real store/game page. */
    kind: 'local-fake-detail' | 'external'
    value: string
  }
}

/**
 * Internal metadata that exists on every creative but is never rendered in
 * the feed UI. Visible only on the Debug screen (dev builds). In Phase 2
 * this is the analogue of the server-only `ad_creatives` document — for now
 * it just travels alongside the public fields in the local seed.
 */
export interface CreativeInternalMeta {
  sourceId: string
  partnerId: string | null
  createdAt: string
  environment: EnvironmentMode
  isTestCreative: boolean
}

export interface Creative extends CreativePublic {
  internal: CreativeInternalMeta
}
