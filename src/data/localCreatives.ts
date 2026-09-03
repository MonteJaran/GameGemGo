import type { Creative } from '../types/creative'

/**
 * The built-in TEST mode creatives — reads this when
 * env.creativeSource === 'local' (VITE_APP_ENV=local_test, still the
 * default — see .env).
 *
 * These 3 used to be bundled HTML under `public/demos/**`. They now live
 * on Cloudflare R2 instead (`kind: 'remote'`, see firebase/HOSTING.md) —
 * the actual files are the same ones, just relocated, not new content —
 * uploaded from `GameGemGo Software/games-to-upload/` on the Desktop,
 * which is also where the source files now live (not in this repo).
 * Everything else about how they render/track/cache is identical to
 * before; only `playable.kind` changed from `local` to `remote`.
 *
 * Deliberately no `featured-fortress-siege`-style entry this time — the
 * earlier one reused `demo-tower-defense`'s exact file under a different
 * title, which was flagged as a real duplicate-content/thin-content risk
 * (see LAUNCH_CHECKLIST.md's audit note). A `placement: 'featured'`
 * example is worth adding back once there's a genuinely distinct game for
 * it, via `GameGemGo Software`'s upload tool.
 *
 * Deliberately still no local/hardcoded `placement: 'promo'` entry here —
 * see firebase/FIREBASE_SCHEMA.md's promo section; that one only ever
 * exists as a Firestore doc.
 */
export const LOCAL_CREATIVES: Creative[] = [
  {
    id: 'demo-endless-runner',
    title: 'Skyline Dash',
    genre: 'runner',
    thumbnail: { kind: 'placeholder-gradient', from: '#ff8a5c', to: '#ff5c8a', glyph: '🏃' },
    badgeLabel: 'Playable Preview',
    partnerLabel: 'Internal Demo',
    playable: { kind: 'remote', entry: 'https://pub-7cc2b4a40a724590af462d9f9d620ae8.r2.dev/playables/network/demo-endless-runner/index.html' },
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
    playable: { kind: 'remote', entry: 'https://pub-7cc2b4a40a724590af462d9f9d620ae8.r2.dev/playables/network/demo-match-3/index.html' },
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
    playable: { kind: 'remote', entry: 'https://pub-7cc2b4a40a724590af462d9f9d620ae8.r2.dev/playables/network/demo-tower-defense/index.html' },
    cta: { kind: 'local-fake-detail', value: 'demo-tower-defense' },
    internal: {
      sourceId: 'local-seed-3',
      partnerId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      environment: 'local_test',
      isTestCreative: true,
    },
  },
]
