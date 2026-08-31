import type { Creative } from '../types/creative'

/**
 * The 3 built-in TEST mode creatives. This is the seed that
 * localCreativeRegistry.ts reads when env.creativeSource === 'local'.
 *
 * Each `playable.entry` points at a fully self-contained HTML/CSS/JS demo
 * under /public/demos/**, loaded in an iframe by PlayablePreviewScreen —
 * the exact same loading mechanism a Phase 2 remote playable will use, so
 * swapping `kind: 'local'` for `kind: 'remote'` later requires no UI change.
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
]
