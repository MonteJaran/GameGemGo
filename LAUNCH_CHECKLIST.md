# Launch checklist — before real playable ads go live

Where things stand vs. what's still open before any outbound click can
become genuinely revenue-eligible. Checked items were done in this
session and are real, tested code — not stubs. Grouped by area, roughly
in the order you'd tackle what's left.

## 1. Server-side qualification & fraud

- [x] `qualifyEvents.ts` — rebuilds `activeFocusedMs` / `interactionCount`
      server-side from `events_raw` (server timestamps only, client
      numbers never trusted) and writes real `qualified_events` docs.
      Excludes `isInternalTestUser` traffic.
- [x] `fraudScoring.ts` — server-authoritative outbound-click scoring with
      **server-held daily counters** (`counters/{uid}_{date}`, atomic
      Firestore transactions — can't be reset by clearing local storage).
      Writes `fraud_flags` when suspicious/blocked.
- [x] Rate limiting on `logRawEvent` (`rateLimit.ts`, 240 events/min/uid,
      fixed-window Firestore counter).
- [x] Client seams wired: `authService.ts` (real `signInAnonymously`),
      `firebaseCreativeReader.ts` (real Firestore read),
      `eventLogger.ts`'s `forwardToServer` (calls `logRawEvent`),
      `outboundClickGatekeeper.ts` (fire-and-forget server confirmation via
      `evaluateOutboundClickServer`, authoritative once it resolves).
      All still fall back cleanly to local_test behavior if Firebase is
      unreachable.
- [x] `firestore.rules` re-run against the emulator — **9/9 tests pass**
      (`firebase/tests/firestore.rules.test.ts`), including the new
      `counters`/`rate_limits` collections.
- [ ] **Firebase App Check** — not done. Without it, anyone can call
      `logRawEvent` / `evaluateOutboundClickServer` directly (curl, not
      your APK) and feed fake events. This needs your action first: enable
      Play Integrity as an App Check provider for the Android app in
      Firebase Console, then wire the corresponding client SDK
      (`@capacitor-firebase/app-check` or similar — the plain web JS SDK's
      reCAPTCHA providers are the wrong fit for a native WebView app).
      Still the single highest-leverage thing left here.
- [ ] Hashed-IP soft cap — needs a source of IP in the Cloud Function
      request context (works once deployed; not testable purely locally).

## 2. Ad partner integration

- [ ] Pick and sign with an actual source of playable inventory — business
      step, not a code one.
- [ ] Confirm their playable spec works inside our sandboxed
      `<iframe sandbox="allow-scripts">`.
- [ ] Hosting decision (partner-hosted vs. mirrored) + validate/sanitize
      what you load.
- [ ] Payout reconciliation agreement with the partner.
- [ ] `syncPublicCreative.ts` — implement for real once `ad_creatives` has
      real partner data flowing in.

## 3. Legal & privacy

- [x] Real Privacy Policy and Terms copy (`PrivacyScreen.tsx` /
      `TermsScreen.tsx`) — accurately describes current + Phase 2 data
      practices. Still flagged in-app as a draft pending actual legal
      review — **get that review before public release**, this isn't
      legal advice.
- [x] Consent banner (`ConsentBanner.tsx`) — first-run prompt, Accept /
      Non-personalized only / link to full Privacy screen. Shown to
      everyone (no geo-IP gating to EEA/UK only — errs toward always
      asking).
- [ ] Real CMP if you want IAB TCF-compliant EEA consent signaling
      specifically (current banner is a good-faith consent record, not a
      full CMP integration).
- [ ] CCPA "Do Not Sell/Share" if targeting US users.
- [ ] Play Console Data Safety section, content rating questionnaire —
      both need Play Console access.

## 4. Google Play policy

- [ ] App content declarations (Play Console).
- [ ] Ads policy re-audit once real partner creatives are in.
- [ ] Invalid-traffic operational process (partner notification, clawback).
- [ ] Play Integrity API (ties into App Check above).

## 5. Release engineering

- [x] Real release keystore generated (`android/app/release.keystore.jks`,
      gitignored) and wired into `build.gradle` via `keystore.properties`
      (also gitignored) — `./gradlew assembleRelease` produces a properly
      signed APK. Verified with `apksigner verify`.
- [x] R8 + resource shrinking enabled for release builds, with the
      Capacitor-specific ProGuard keep rules it needs
      (`proguard-rules.pro`) — debug APK 4.5MB → release APK **1.29MB**.
- [ ] Play App Signing enrollment — needs Play Console; the local keystore
      above becomes your *upload* key once you enroll.
- [ ] `targetSdkVersion` compliance check at actual submission time
      (currently 36).
- [ ] Closed testing track (Play Console requirement).
- [ ] Firebase Crashlytics — not added; `google-services` plugin is
      already wired (Capacitor's template includes it), so this is a
      smaller lift than it looks whenever you want it.

## 6. Real-world QA

- [ ] Real mid/low-range Android hardware, not just emulator/browser.
- [ ] A real partner playable through the full pipeline.
- [x] Rules re-tested locally this session — re-run
      `cd firebase && npm run test:rules` before every future rules change.

## 7. Ops / monitoring

- [x] Bare-bones kill switch: `firebase/scripts/set-production-flag.mjs`
      (needs a service account key you generate yourself in Firebase
      Console — never share that key with anyone, including here).
- [ ] Real dashboard/scheduled query over `qualified_events`/`fraud_flags`.
- [ ] Alerting on Cloud Function error rate / fraud-flag spikes.

---

**What's not done and needs *you* specifically**: signing an ad partner,
Firebase Console actions (App Check provider setup), Play Console
(everything in §4, Play App Signing, closed testing), an actual legal
review of the Privacy/Terms draft, and testing on real hardware with real
partner content. Everything else code-shaped was completed and verified
(build passes, rules tests pass, signed release APK builds) this session.

**Deploying what's built** (`firebase deploy` for rules + functions, to
project `gamegem-1614d`) hasn't been done yet — that's a live-infrastructure
action on your actual Google account, worth a explicit go-ahead rather than
doing it silently. Say the word and it's one command.
