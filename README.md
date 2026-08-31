# SwipePlayable

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
  vertical swipe stack of the 3 demo creatives. No splash animation.
- **3 built-in playable demos** (`public/demos/*/index.html`) — Skyline
  Dash (endless runner), Gem Cascade (match-3), Last Bastion (tower
  defense). Each is a self-contained HTML/CSS/canvas file with zero
  external dependencies, loaded in a sandboxed `<iframe>`.
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
    feed/         feedService.ts — picks local vs Firebase source, with fallback
    creatives/    localCreativeRegistry.ts, firebaseCreativeReader.ts (Phase 2 stub)
    events/       eventLogger.ts
    qualification/qualificationEngine.ts — Level 1-4, CLIENT CANDIDATE ONLY
    session/      playableSessionManager.ts — active time, interactions, exit reason
    fraud/        fraudChecker.ts, outboundClickGatekeeper.ts, clickHistoryStore.ts
    privacy/      privacyConsentService.ts (placeholder)
    firebase/     firebaseClient.ts — Phase 2 entry point, dynamically imported only
  router/         router.tsx — ~80-line hash router (no react-router)
  hooks/          useFeed.ts, usePlayableSession.ts
  components/     FeedCard, FeedCardStack, Thumbnail, Badge, Button, EmptyState
  screens/        HomeFeedScreen (eager) + 6 lazy screens
public/
  demos/          the 3 built-in playable HTML demos
firebase/
  firestore.rules, firestore.indexes.json, firebase.json
  FIREBASE_SCHEMA.md   full collection-by-collection schema doc
  functions/            real Cloud Functions (qualifyEvents, fraudScoring,
                         logRawEvent, syncPublicCreative) — written and
                         type-checked, not yet deployed
  scripts/              set-production-flag.mjs, a bare-bones kill switch
  seed/                 example ad_creatives / app_config documents
  tests/                Firestore rules tests — 9/9 passing against the
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
`com.gamegemgo` (matches `capacitor.config.ts`'s `appId`). Its Android
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
to clients, the `users/{uid}` field whitelist, default-deny) — **9/9
passing** as of this build. Extend it as the schema grows — never deploy
a rules change without running this first.

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
   com.gamegemgo`, matching the Android app registered in Firebase
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
