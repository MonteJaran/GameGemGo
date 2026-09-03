import type { Creative } from '../types/creative'

/**
 * The 3 built-in TEST mode creatives. This is the seed that
 * localCreativeRegistry.ts reads when env.creativeSource === 'local'.
 *
 * Each `playable.entry` points at a fully self-contained HTML/CSS/JS demo
 * under /public/demos/**, loaded live in the top feed card's iframe (see
 * FeedCard.tsx) — the exact same loading mechanism a Phase 2 remote
 * playable will use, so swapping `kind: 'local'` for `kind: 'remote'` later
 * requires no UI change.
 *
 * Deliberately no local/hardcoded `placement: 'promo'` entry here — a
 * promo game is never bundled into the app. It only ever exists as a
 * Firestore `ad_creatives` doc added via `addPromoGame` (see
 * firebase/FIREBASE_SCHEMA.md), fetched and rendered the exact same way
 * as any other `kind: 'remote'` creative. There's nothing to see locally
 * until one is actually added there.
 *
 * There IS one `placement: 'featured'` entry below (`featured-fortress-
 * siege`) — unlike promo, featured is meant to be bundled/curated content,
 * so a local placeholder makes sense. It currently reuses the tower-
 * defense demo's HTML as a stand-in so the mechanism (random position,
 * plain framing, normal tracking — see feedService.ts's scatterFeatured
 * and creative.ts's `placement` doc) is visibly exercised today; swap
 * `playable.entry` for a genuinely distinct game (built or submitted, see
 * LAUNCH_CHECKLIST.md) whenever one's ready — everything else here stays
 * the same.
 */
export const LOCAL_CREATIVES: Creative[] = [
  {
    id: 'demo-endless-runner',
    title: 'Skyline Dash',
    genre: 'runner',
    thumbnail: { kind: 'placeholder-gradient', from: '#ff8a5c', to: '#ff5c8a', glyph: '🏃' },
    badgeLabel: 'Playable Preview',
    partnerLabel: 'Internal Demo',
    playable: { kind: 'local', entry: '/demos/endless-runner/index.html' },
    cta: { kind: 'local-fake-detail', value: 'demo-endless-runner' },
    internal: {
      sourceId: 'local-seed-1',
      partnerId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      environment: 'local_test',
      isTestCreative: true,
    },
  },
  {
    id: 'demo-match-3',
    title: 'Gem Cascade',
    genre: 'puzzle',
    thumbnail: { kind: 'placeholder-gradient', from: '#5cc8ff', to: '#7a5cff', glyph: '💎' },
    badgeLabel: 'Playable Preview',
    partnerLabel: 'Internal Demo',
    playable: { kind: 'local', entry: '/demos/match-3/index.html' },
    cta: { kind: 'local-fake-detail', value: 'demo-match-3' },
    internal: {
      sourceId: 'local-seed-2',
      partnerId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      environment: 'local_test',
      isTestCreative: true,
    },
  },
  {
    id: 'demo-tower-defense',
    title: 'Last Bastion',
    genre: 'strategy',
    thumbnail: { kind: 'placeholder-gradient', from: '#5cff9d', to: '#5cb8ff', glyph: '🏰' },
    badgeLabel: 'Playable Preview',
    partnerLabel: 'Internal Demo',
    playable: { kind: 'local', entry: '/demos/tower-defense/index.html' },
    cta: { kind: 'local-fake-detail', value: 'demo-tower-defense' },
    internal: {
      sourceId: 'local-seed-3',
      partnerId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      environment: 'local_test',
      isTestCreative: true,
    },
  },
  {
    id: 'featured-fortress-siege',
    title: 'Fortress Siege',
    genre: 'strategy',
    thumbnail: { kind: 'placeholder-gradient', from: '#9d5cff', to: '#5c7aff', glyph: '🛡️' },
    badgeLabel: 'Playable Preview',
    partnerLabel: 'GameGem Pick',
    // Reuses the tower-defense demo as a placeholder — see the module doc
    // comment above for why, and swap this once a real featured game exists.
    playable: { kind: 'local', entry: '/demos/tower-defense/index.html' },
    cta: { kind: 'local-fake-detail', value: 'featured-fortress-siege' },
    placement: 'featured',
    internal: {
      sourceId: 'local-seed-4',
      partnerId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      environment: 'local_test',
      isTestCreative: true,
    },
  },
]
