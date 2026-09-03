# GameGemGo

A swipe feed for discovering playable game ad previews. Android-first MVP,
built as a fast Capacitor + React + TypeScript shell — **not** a game
engine app.

Status: runs today in **local_test mode** with zero external services (3
built-in demo playables, local event logging, client-side fraud/
qualification simulation). The Phase 2 Firebase backend — Auth, Firestore
rules, Cloud Functions for server-side qualification/fraud — is written,
type-checked, and passing its rules test suite, but not yet deployed to
the live project; see "Phase 2" below and `LAUNCH_CHECKLIST.md` for
what's left before real monetization.

## Quick start (Phase 1 — no Android tooling needed)

```bash
npm install
npm run dev
```

Open the printed `localhost` URL. `.env` already defaults to
`VITE_APP_ENV=local_test`, so the feed loads the 3 built-in demo
creatives immediately — nothing to configure.

This is the fastest way to iterate on UI/logic: a normal browser tab, no
emulator, no Android Studio. The app doesn't use any Capacitor-native
plugin yet, so behavior in a desktop browser tab and in the eventual
Android WebView is effectively identical.

## What's actually in Phase 1

- **Home Feed** (`src/screens/HomeFeedScreen.tsx`) — boots straight into a
  vertical swipe stack of the 3 demo creatives. No splash animation, no
  chrome over the game at all — see "No Play button: the feed card *is*
  the game" below.
- **3 built-in playable demos** (`public/demos/*/index.html`) — Skyline
  Dash (endless runner), Gem Cascade (match-3), Last Bastion (tower
  defense). Each is a self-contained HTML/CSS/canvas file with zero
  external dependencies, loaded live in the top feed card's sandboxed
  `<iframe>`.
- **Event tracking** (`src/services/events/eventLogger.ts`) — every event
  from the spec's event model, kept in a local ring buffer +
  `localStorage`, visible on the Debug screen.
- **Client-side qualification engine** (`src/services/qualification`) —
  Level 1–4 exactly as specified. This is a *candidate* signal only; see
  "Phase 2" for why nothing here is a real monetization decision.
- **Fraud checker + outbound click gatekeeper**
  (`src/services/fraud/*`) — behavior-scoring, not a single rule; daily
  caps; every decision logged. Also a client-side simulation for now.
- **Profile, Debug, Privacy, Terms screens** — Debug is excluded from
  anything built with `VITE_APP_ENV=production` (see `src/config/env.ts`).

## No Play button: the feed card *is* the game

There's no "Try"/"Play" step, no separate preview screen, and no chrome
drawn over the game at all — no badge, no title, no visible button. The
top card's real game is already running the moment it reaches the top of
the stack (`src/components/FeedCard.tsx`); a promo placement's only visual
difference is its gold/emerald frame.

Both actions live on the same thin zone at the very top and bottom edge
of the card, never the middle:
- **drag** (past a small threshold) — swipe the card away (up = skip to
  next, down = restore the previous one);
- **tap** (barely any movement) — open the game's page, through the same
  fraud gatekeeper as before; a block just silently no-ops, nothing is
  shown for it.

Restricting both to the edges — rather than a Y-coordinate check on a
card-wide handler — is deliberate, not just styling: once a live game (a
cross-origin sandboxed `<iframe>`) occupies the middle of the card, a
pointer that moves over it stops being deliverable to the parent page at
all, so a gesture has to start on an element outside the iframe to track
reliably. Gameplay touches in the middle always reach the game untouched.
Only the current (top) card ever mounts a live iframe — the next one
stays a static thumbnail until it becomes current, so there's never more
than one game running at once.

**Background prefetch**: `src/services/creatives/playableCache.ts` — as
soon as the feed list loads, every `kind: 'remote'` creative *after the
first* is fetched and cached (Cache Storage API) in the background,
sequentially and in feed order (never all at once — see `prefetchAll`'s
own comment for why firing them in parallel would actually slow the next
card down on a constrained connection), fire-and-forget from
`useFeed.ts`. The first (topmost) creative is deliberately *not*
background-prefetched — `FeedCard.tsx`'s `LivePlayableFrame` already loads
it directly via a live `<iframe src>` the instant it's the interactive top
card, so prefetching the same URL again at the same time would just split
one connection's bandwidth between two requests for the identical file.
Every other card renders straight from cache (`srcDoc`) once its turn in
the queue is done, and falls back to a live fetch (`src={url}`) whenever
nothing's cached yet, so a card is never stuck empty just because
prefetching hasn't reached it.

## Promo games (prepaid sponsor placements)

A "promo" creative is a prepaid placement — a company paying to be
featured at the top of the feed, rather than ordinary ad-network
inventory earning per-click/engagement revenue. **Never hardcoded into
the app** — it's exactly the same kind of `ad_creatives` doc as any other
`kind: 'remote'` creative (a URL you host — Firebase Hosting/Storage, your
own server, wherever — the app downloads and caches it, see above),
rendered by the exact same feed → sandboxed-iframe pipeline (see
`firebase/FIREBASE_SCHEMA.md`'s promo section for the full field list).
Only a `placement: 'promo'` flag distinguishes it, which:
- sorts it first in the feed (`src/services/feed/feedService.ts`),
- gives it a gold/emerald frame instead of the plain card border (`FeedCard.tsx`),
- and, server-side, makes two existing Cloud Functions also draw down its
  prepaid balance in real time — a qualified engagement
  (`functions/src/promoSpendTracker.ts`) or a real, non-blocked outbound
  click (`functions/src/fraudScoring.ts`) — auto-pausing the campaign the
  moment spend reaches what was prepaid.

Add or edit one via the `addPromoGame` Cloud Function
(`functions/src/promoAdmin.ts`, gated on an `admin` custom claim — one-time
setup: `firebase/scripts/set-admin-claim.mjs`) — pass it the game's URL,
not a file. Check what a campaign has generated and what's left of its
budget with `firebase/scripts/promo-billing-report.mjs`, which also flags
anything that looks wrong (overspend, drift between the stored and
recomputed spend, a lopsided click:engagement ratio, correlated fraud
flags).

## Featured games (curated filler, not paid, not ad-network)

A third `placement` value alongside `network`/`promo`: `featured` is the
operator's own bundled/curated content, added specifically so the feed
doesn't look thin (empty ad-network inventory + zero owned content reads
as a low-effort app to a Play Store reviewer). It is **not** a promo —
no prepaid balance, no rate card, no money fields exist for it at all,
and nothing in the promo billing path ever fires for it
(`promoSpendGuard.ts`'s `bumpPromoCounter` checks `placement === 'promo'`
specifically, so a featured creative is always a no-op there). It gets
the same plain framing as a `network` creative, and the same engagement/
click tracking — nothing in `eventLogger.ts`, `qualificationEngine.ts`, or
`outboundClickGatekeeper.ts` branches on `placement` at all, so a featured
creative's time-on-screen/interactions are counted exactly like any other
game's, with no separate calculator.

The only thing that's different is position: `feedService.ts`'s
`scatterFeatured` drops each featured creative at a random index among
the `network` creatives on every feed load (after promo's pinned-first
creatives), instead of leaving it in source order — so it shows up in a
different spot in the scroll each time rather than always the same slot.
One example ships today, `featured-fortress-siege` in `localCreatives.ts`
— it currently reuses the tower-defense demo's HTML as a placeholder;
swap `playable.entry` for a genuinely distinct game whenever one's ready.

## Business / advertiser-facing pieces

- **In-app**: Profile & Settings → Business (`src/screens/BusinessScreen.tsx`)
  explains how to get a game featured (free during early access — points at
  a submission form, see `src/config/business.ts` for the URL placeholder to
  fill in) or ask about a promo placement (contact instead of a public
  price list). Mirrors `firebase/public/advertise/index.html` on the public
  site — keep both in sync by hand, the webpage can't import the screen's JSX.
- **Hosting playables cheaply at scale**: `firebase/HOSTING.md` — Cloudflare
  R2 setup (zero egress cost, unlike Firebase Storage/S3/GCS which bill per
  GB downloaded) and the upload workflow. `playable.entry` is just a URL,
  so this is a hosting decision, not a code change.
- **Promo rate-card planning**: `firebase/PROMO_PRICING_GUIDE.md` — industry
  CPC/eCPM benchmark anchors plus `firebase/scripts/promo-pricing-
  calculator.mjs`, a pure-arithmetic CLI that turns a prepaid budget into
  projected clicks/engagements under a rate card. Reference material for
  *setting* a campaign's terms — not wired into any live code.
- **Creative performance reporting**: `firebase/scripts/creative-
  performance-report.mjs` — read-only, built from the same
  `playable_focus_end` events every session already logs (`activeFocusedMs`
  at exit *is* "what second did they skip"). Reports a time-to-exit
  histogram, engaged rate, and outbound CTR for one creative, with a few
  plain-language suggestions. Needs Phase 2 deployed + real traffic to say
  anything (see `LAUNCH_CHECKLIST.md`) — written now so it's ready then.
  Disclosed to users in `PrivacyScreen.tsx`/`TermsScreen.tsx` as the
  aggregate, non-identifying signal a creative's developer may receive.

## Environment modes

| | `local_test` | `staging` | `production` |
|---|---|---|---|
| Creative source | built-in local seed | Firebase (`ad_creatives_public`) | Firebase |
| Firebase touched at all? | no | yes | yes |
| Fraud checker | active (local sim) | active | active, server-authoritative |
| Debug screen | on | on | **off**, always |
| Outbound clicks revenue-eligible? | never (no real inventory) | never | yes, once Phase 2's server checks pass |

Set `VITE_APP_ENV` in `.env` (see `.env.example`). Copy
`.env.example` → `.env.staging` / `.env.production` and fill in your
Firebase project's config when you get to Phase 2.

## Project structure

```
src/
  config/         env.ts (mode flags), firebaseConfig.ts (plain object, no SDK import)
  types/          Creative, TrackedEvent, EngagementStats, GatekeeperResult, ...
  data/           localCreatives.ts — the 3 built-in TEST mode creatives
  services/
    auth/         anonymous-uid adapter (local now, Firebase Auth in Phase 2)
    feed/         feedService.ts — picks local vs Firebase source, sorts promo-first, with fallback
    creatives/    localCreativeRegistry.ts, firebaseCreativeReader.ts (Phase 2 stub),
                   playableCache.ts — background download/cache for remote playables
    events/       eventLogger.ts
    qualification/qualificationEngine.ts — Level 1-4, CLIENT CANDIDATE ONLY
    session/      playableSessionManager.ts — active time, interactions, exit reason
    fraud/        fraudChecker.ts, outboundClickGatekeeper.ts, clickHistoryStore.ts
    privacy/      privacyConsentService.ts (placeholder)
    firebase/     firebaseClient.ts — Phase 2 entry point, dynamically imported only
  router/         router.tsx — ~80-line hash router (no react-router)
  hooks/          useFeed.ts (also kicks off the background prefetch), usePlayableSession.ts
  components/     FeedCard (the live game, no chrome, promo frame),
                   FeedCardStack (drag/tap, owns the playable session),
                   Thumbnail, Button, EmptyState
  screens/        HomeFeedScreen (eager) + 5 lazy screens — no dedicated
                   "play" screen, see "No Play button" above
public/
  demos/          the 3 built-in playable HTML demos
firebase/
  firestore.rules, firestore.indexes.json, firebase.json
  FIREBASE_SCHEMA.md   full collection-by-collection schema doc
  functions/            real Cloud Functions (qualifyEvents, fraudScoring,
                         logRawEvent, syncPublicCreative, addPromoGame,
                         trackPromoEngagementSpend) — written and
                         type-checked, not yet deployed
  scripts/              set-production-flag.mjs (bare-bones kill switch),
                         set-admin-claim.mjs, promo-billing-report.mjs
  seed/                 example ad_creatives / app_config documents
  tests/                Firestore rules tests — 10/10 passing against the
                         emulator (`cd firebase && npm run test:rules`)
```

## Performance choices (why it starts fast)

- `HomeFeedScreen` is the only eagerly-imported screen; every other screen
  is `React.lazy` (see `src/App.tsx`) — a route-level code-split chunk per
  screen.
- `firebase` is never statically imported by anything in the local_test
  render path — only `services/firebase/firebaseClient.ts` touches the SDK,
  and it's always reached through a dynamic `import()`. `vite.config.ts`
  also isolates it into its own `vendor-firebase` chunk, so it's not even
  downloaded unless the app is in `staging`/`production` mode.
- No remote config fetch blocks first paint — `useFeed` only starts
  fetching from a `useEffect`, after the feed shell has already rendered.
- Auth (`ensureSignedIn`) and the first `app_open` event fire from an
  effect in `App.tsx`, after mount — never during the initial render.
- No animation/CSS libraries; drag physics in `FeedCardStack` mutate a
  DOM node's `transform` directly instead of going through React state on
  every `pointermove`.

## Phase 2: wiring up Firebase

The Firebase project is already set up: **gamegem-1614d**, package name
`com.gamegemgo.myapp` (matches `capacitor.config.ts`'s `appId` — originally
`com.gamegemgo`, changed after Play Console rejected that as already taken
and suggested this one; the project's `google-services.json` carries both
Android app registrations, only the second one matters now). Its Android
`google-services.json` lives at `firebase/google-services.json` (the
durable reference copy — `android/app/google-services.json` is the one
Gradle actually reads, and gets wiped if you ever regenerate `android/`
via `npx cap add android`; re-copy it from `firebase/` if that happens).
`.env.staging` is already filled in with that project's client config —
nothing to paste in, just flip `VITE_APP_ENV=staging` when you get to
step 5. Both files are gitignored (not secrets — Firestore rules are what
actually gate access — just kept out of the repo by default).

The code side of Phase 2 is done — client seams (`authService.ts`,
`firebaseCreativeReader.ts`, `eventLogger.ts`, `outboundClickGatekeeper.ts`)
are wired for real, and the Cloud Functions
(`qualifyEvents.ts`/`fraudScoring.ts`/`logRawEvent.ts`/`syncPublicCreative.ts`)
have real logic, not stubs. What's left is deploying it and populating
real data:

1. Firestore: create `ad_creatives_public`, `app_config_public` (client
   readable) and everything else from `firebase/FIREBASE_SCHEMA.md`
   (server-only). `firebase/seed/*.sample.json` show example shapes.
2. Deploy rules: `firebase deploy --only firestore:rules` (from
   `firebase/`, after `firebase init` / `firebase use gamegem-1614d`).
3. Deploy functions: `cd firebase/functions && npm install && npm run build`,
   then `firebase deploy --only functions` (from `firebase/`).
4. Set `VITE_APP_ENV=staging` (or `production`) and rebuild.
5. Before real money is involved: add Firebase App Check (see
   `LAUNCH_CHECKLIST.md` §1) — without it, the callable functions can be
   invoked directly by anything, not just this app.

### Testing security rules

```bash
cd firebase
npm install
npm run test:rules
```

`firebase/tests/firestore.rules.test.ts` covers the load-bearing cases
(public read/no write, `events_raw`/`counters`/`rate_limits` fully closed
to clients, promo campaign money fields fully closed to clients, the
`users/{uid}` field whitelist, default-deny) — **10/10 passing** as of
this build. Extend it as the schema grows — never deploy a rules change
without running this first.

## Building for Android

Nothing here needs Android Studio yet — Phase 1 is verified as a web app
(`npm run dev`, or `npm run build && npm run preview`). When you're ready
to see it as an actual Android app:

1. Install **Android Studio** (includes the Android SDK) and a JDK 17+.
   During Android Studio's first-run setup, let it install the SDK
   platform tools — that's the part `npx cap` needs.
2. `android/` already exists (`npm run cap:add:android` was already run
   once, confirmed to work with just Node — no Android Studio needed for
   *this* step, only to actually build from here on) with `appId
   com.gamegemgo.myapp`, matching the Android app registered in Firebase
   project `gamegem-1614d`. If you ever delete/regenerate it, copy
   `firebase/google-services.json` back into `android/app/` afterward —
   `cap add android` doesn't know about that file.
3. `npm run cap:sync` — builds the web app and copies it + native deps
   into `android/`.
4. `npm run cap:open:android` — opens the project in Android Studio. Run
   it on an emulator or a USB-connected device from there (▶ Run button),
   or from the command line: `cd android && ./gradlew assembleDebug`
   (needs a JDK — see `android/gradle.properties`'s `org.gradle.java.home`
   if command-line builds ever fail with a Java version error; Capacitor
   8 requires JDK 21 for the native build specifically).

`android/` is tracked in git (it carries real hand-written config now —
release signing, R8 rules — not just Capacitor's disposable template) with
generated/machine-specific/secret parts excluded — see `.gitignore`. A
signed release build already works:

```bash
cd android && ./gradlew assembleRelease
```

using `android/keystore.properties` + `android/app/release.keystore.jks`
(both gitignored, generated once for this machine — **back them up**;
losing the keystore means you can't update the app under the same signing
identity later, though Play App Signing enrollment mitigates this once
you publish). `minifyEnabled`/`shrinkResources` are on for release builds
(R8 + Capacitor-specific keep rules in `proguard-rules.pro`).

## Where a real ad SDK plugs in later

Nothing here talks to AppLovin/AdMob/a playable-ad network yet, on
purpose (spec: "No live ads yet"). The seams are:

- `src/types/creative.ts`'s `playable.kind` — add a third variant
  alongside `local`/`remote` once a partner SDK provides its own render
  surface instead of a plain iframe URL.
- `src/services/creatives/firebaseCreativeReader.ts` — a partner network's
  server-to-server or client SDK creative fetch would live behind the same
  `feedService.loadFeedCreatives()` interface.
- `src/services/fraud/outboundClickGatekeeper.ts` — the same `allow` /
  `allow_suspicious` / `block` contract should gate any partner SDK click
  callback, not just the two local navigation targets it drives today.

Internal test traffic (`VITE_INTERNAL_TEST_USER=true`, the
`internal_test_user` event) stays excluded from anything revenue-related
already — both `qualifyEvents.ts` and `fraudScoring.ts` check
`users/{uid}.isInternalTestUser` (server-set only) before writing anything
to `qualified_events`.

## Also see

- `LAUNCH_CHECKLIST.md` — everything between here and real playable ads
  going live: what's done, what's left, and what needs your action
  specifically (Firebase/Play Console, legal review, a signed partner).
