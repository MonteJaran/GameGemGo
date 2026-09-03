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
| placement | string | `network` (default) \| `promo` \| `featured` — a `promo` creative is a manually configured, prepaid sponsor placement, not ad-network inventory; same rendering pipeline (its `playable.entry` is a URL you host, never anything bundled into the app), sorted first in the feed, given a gold/emerald frame (`promoTier`). A `featured` creative is the operator's own curated/bundled filler content — no money fields exist for it at all, not billed by anything in the promo spend path (`promoSpendGuard.ts` checks `placement === 'promo'` specifically); it gets plain framing like `network` and is tracked identically (engagement/click accounting doesn't branch on `placement` anywhere), the only difference being the client (`feedService.ts`'s `scatterFeatured`) drops it at a random index among the `network` creatives on every feed load instead of leaving it in place. Purely presentational to the client — no money field below is ever projected here. |
| promoTier | string? | `gold` \| `emerald`, only meaningful when `placement === 'promo'` |
| priority | number? | ordering among multiple simultaneous promo placements (higher first) — not a ranking/quality signal, so unlike `qualityScore` it's safe to expose |
| publishedAt | timestamp | |

## `ad_creatives/{creativeId}`
Server-only. Superset of the public doc plus:

| field | type | notes |
|---|---|---|
| partnerId | string | |
| payoutTermsRef | string | pointer into `partner_sensitive` |
| qualityScore | number | internal ranking signal, never exposed to client |
| revenueFlags | map | |
| active | boolean | Cloud Function reads this to decide whether to mirror the doc into `ad_creatives_public`. For a promo doc this is derived from `status` (`active` only when `status === 'active'`), not set independently — see below. |

### Promo (prepaid sponsor) fields — only present when `placement === 'promo'`

A "promo game" is a manually configured, prepaid placement (a company
paying to be on top of the feed, "playable ads" they never earn
per-click/engagement revenue from — they draw down a prepaid balance
instead). Never bundled into the app — `playable.entry` is a URL to
wherever you've hosted that game (Firebase Hosting/Storage, your own
server, ...), downloaded and cached by the client in the background
(`src/services/creatives/playableCache.ts`) exactly like a `network`
creative's. It's still just an `ad_creatives` doc, rendered by the exact
same feed → sandboxed-iframe pipeline as any other creative — no parallel
rendering system.

| field | type | notes |
|---|---|---|
| prepaidAmountCents | number | integer cents, never a float |
| rateCardCents | map | `{ perClickCents, perEngagementCents }` — set per deal (different sponsors can have different terms) |
| clicksCount | number | server-maintained; see below |
| engagementsCount | number | server-maintained; see below |
| spentCents | number | server-maintained cache of `computeSpendCents(clicksCount, engagementsCount, rateCardCents)` (`functions/src/promoBilling.ts`) — always recomputed and rewritten together with the counts in the same transaction, never updated independently |
| status | string | `active` \| `paused` \| `exhausted` — `paused` is only ever set by a human (via `addPromoGame`) and is sticky (a trigger never auto-resumes it); `exhausted` is set automatically once `spentCents >= prepaidAmountCents` (`promoBilling.ts`'s `nextPromoStatus`) |

**Adding/editing a promo game**: the `addPromoGame` callable Cloud
Function (`functions/src/promoAdmin.ts`), gated on the caller's `admin`
custom claim (see `scripts/set-admin-claim.mjs` for one-time setup). Call
it again with the same `creativeId` to top up the budget, change the rate
card, or pause/resume — it never touches `clicksCount`/`engagementsCount`
on an edit.

**Billing a click/engagement**: two triggers, sharing one helper
(`functions/src/promoSpendGuard.ts`'s `bumpPromoCounter`) so the logic
can't drift between them:
- a qualified engagement → `promoSpendTracker.ts`, triggered on every new
  `qualified_events` doc (the same authoritative, already
  fraud/internal-test-filtered signal `qualifyEvents.ts` produces);
- a real outbound click → a hook inside `fraudScoring.ts`'s
  `evaluateOutboundClickServer`, gated on `decision !== 'block'` — the
  same condition that function already uses for `revenueEligible`, so a
  fraud-flagged/blocked click never draws down a sponsor's prepaid balance.

Both call `nextPromoStatus` after bumping their counter; once spend
reaches the prepaid amount the doc flips to `status: 'exhausted'` and
`active: false` — which cascades through the *existing* `syncPublicCreative`
delete-on-inactive logic below, so an exhausted campaign simply stops
appearing with no separate "hide it" mechanism.

**Reporting / irregularity checks**: `scripts/promo-billing-report.mjs` —
read-only, prints each promo campaign's computed spend/remaining balance
and flags drift, overspend, a status/active mismatch, a lopsided
click:engagement ratio, or any correlated `fraud_flags`.

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

`scripts/creative-performance-report.mjs` reads this collection (filtered
to one `creativeId`) to build a time-to-exit histogram and engaged-rate
readout for a creative's developer — see README's "Business /
advertiser-facing pieces".

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
