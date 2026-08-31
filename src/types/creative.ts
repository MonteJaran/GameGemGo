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
