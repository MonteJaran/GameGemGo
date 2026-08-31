# Firestore schema (Phase 2)

Not connected yet in Phase 1 (local_test mode uses `src/data/localCreatives.ts`
instead). This is the target shape for when staging/production mode is wired
up. Pairs with `firestore.rules` — read that alongside this.

Core split: **`*_public` collections are the only ones the client ever reads.
Everything else is server-only** (Admin SDK inside Cloud Functions).

## `ad_creatives_public/{creativeId}`
Client-readable. Maps 1:1 to `src/types/creative.ts`'s `CreativePublic`.

| field | type | notes |
|---|---|---|
| title | string | |
| genre | string | `runner` \| `puzzle` \| `strategy` (extend as needed) |
| thumbnail | map | `{ kind: 'image', url, from, to, glyph }` — `from`/`to`/`glyph` are the gradient fallback if `url` 404s |
| badgeLabel | string | always `"Playable Preview"` |
| partnerLabel | string? | optional, shown small on the card |
| playable | map | `{ kind: 'remote', entry: <url> }` — loaded in the same sandboxed iframe as local_test demos |
| cta | map | `{ kind: 'external', value: <url> }` |
| publishedAt | timestamp | |

## `ad_creatives/{creativeId}`
Server-only. Superset of the public doc plus:

| field | type | notes |
|---|---|---|
| partnerId | string | |
| payoutTermsRef | string | pointer into `partner_sensitive` |
| qualityScore | number | internal ranking signal, never exposed to client |
| revenueFlags | map | |
| active | boolean | Cloud Function reads this to decide whether to mirror the doc into `ad_creatives_public` |

A Cloud Function (`syncPublicCreative`, trigger on write) projects the safe
subset of a changed `ad_creatives/{id}` doc into `ad_creatives_public/{id}`.
The client never writes either collection.

## `users/{uid}`
Owner-read/write, but only a small field whitelist (see `firestore.rules`).

| field | type | writable by owner? |
|---|---|---|
| createdAt | timestamp | create only |
| nonPersonalizedMode | boolean | yes |
| consent | string | yes (`unset`\|`granted`\|`denied`) |
| isInternalTestUser | boolean | **no** — server-set only, from an allowlist of QA uids/devices |

## `events_raw/{eventId}`
Server-only writes, via the `logRawEvent` callable function — never a
direct client `setDoc`. See SECURITY RULES REQUIREMENTS in the product
spec for why (client can't forge/backdate events if it can't write them).

| field | type |
|---|---|
| name | string (`EventName`, see `src/types/events.ts`) |
| ts | server timestamp |
| clientTs | number (client-reported, for latency/clock-skew diagnostics only — never trusted) |
| uid | string |
| sessionId | string |
| creativeId | string? |
| payload | map? |
| environment | string |

## `sessions/{sessionId}`
Server-only. Built by Cloud Functions from `events_raw` (playable_open →
playable_focus_end), not written directly by the client.

## `qualified_events/{eventId}`
Server-only. The **authoritative** Level 1–4 qualification outcome —
recomputed server-side from `events_raw` using the same thresholds as
`src/services/qualification/qualificationEngine.ts` (kept in sync
manually; see `functions/src/qualifyEvents.ts`). This is the only place a
"qualified engagement" is real, not just a client candidate.

## `fraud_flags/{flagId}`
Server-only. Output of the server-side fraud re-evaluation
(`functions/src/fraudScoring.ts`), keyed by uid/session/creative.

| field | type |
|---|---|
| uid | string |
| sessionId | string |
| creativeId | string |
| score | number |
| reasons | string[] |
| decision | `allow` \| `allow_suspicious` \| `block` |
| createdAt | timestamp |

## `counters/{uid}_{yyyy-mm-dd}`
Server-only. Daily outbound-click counters (`total`, `perCreative.{id}`),
maintained atomically by `functions/src/fraudScoring.ts` — exists
specifically so the daily caps can't be reset by clearing local app
storage the way the client's own soft-cap tracking can.

## `rate_limits/{uid}_{bucket}_{windowIndex}`
Server-only. Generic fixed-window rate limiter (`functions/src/rateLimit.ts`),
currently used to cap `logRawEvent` calls per uid per minute. Carries an
`expiresAt` field — configure a Firestore TTL policy on it (Console >
Firestore > TTL) so old windows get swept automatically.

## `production_flags/{docId}`
Server-only. Kill switches / rollout flags for monetization behavior
(e.g. "pause all outbound clicks", "force staging fraud thresholds").

## `partner_sensitive/{docId}`
Server-only. Payout terms, partner contact/billing info — never touched
by anything except an admin tool / Cloud Function.

## `app_config/{docId}` vs `app_config_public/{docId}`
Same split as creatives: `app_config` holds everything (including internal
thresholds, partner-specific overrides); a Cloud Function projects only the
safe subset into `app_config_public`, which is what
`src/services/creatives/firebaseCreativeReader.ts`-style client code reads.
