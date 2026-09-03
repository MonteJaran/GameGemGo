/**
 * Security rules tests — SPEC REQUIREMENT: "Use Firebase emulators/tests
 * for rule validation." Run with:
 *
 *   cd firebase && npm install && npm run test:rules
 *
 * Each test below documents the specific rule it's pinned to — extend
 * this file as the rules grow, and re-run it before every rules deploy.
 */
import { describe, it, beforeAll, afterAll } from 'vitest'
import { initializeTestEnvironment, assertSucceeds, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'swipeplayable-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

describe('ad_creatives_public', () => {
  it('allows anyone to read', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(db.doc('ad_creatives_public/demo-endless-runner').get())
  })

  it('denies client writes, even when authenticated', async () => {
    const db = testEnv.authenticatedContext('user_1').firestore()
    await assertFails(db.doc('ad_creatives_public/demo-endless-runner').set({ title: 'Hacked' }))
  })
})

describe('ad_creatives (server-only)', () => {
  it('denies client reads', async () => {
    const db = testEnv.authenticatedContext('user_1').firestore()
    await assertFails(db.doc('ad_creatives/demo-endless-runner').get())
  })

  // Promo (prepaid sponsor) campaigns are just ad_creatives docs with extra
  // fields (see FIREBASE_SCHEMA.md) — same collection, same rule, but this
  // is worth pinning explicitly since those extra fields are real money
  // (prepaidAmountCents, rateCardCents, clicksCount, engagementsCount,
  // spentCents) and must never be client-readable or client-writable.
  it('denies client reads/writes of a promo campaign doc, including its money fields', async () => {
    const db = testEnv.authenticatedContext('user_1').firestore()
    await assertFails(db.doc('ad_creatives/promo-acme-2026-09').get())
    await assertFails(
      db.doc('ad_creatives/promo-acme-2026-09').set({
        placement: 'promo',
        prepaidAmountCents: 100000,
        rateCardCents: { perClickCents: 100, perEngagementCents: 50 },
        clicksCount: 0,
        engagementsCount: 0,
      }),
    )
  })
})

describe('events_raw', () => {
  it('denies ALL client writes, even from the event owner', async () => {
    const db = testEnv.authenticatedContext('user_1').firestore()
    await assertFails(
      db.collection('events_raw').add({ name: 'outbound_click', uid: 'user_1', sessionId: 's1' }),
    )
  })
})

describe('qualified_events / fraud_flags / production_flags / partner_sensitive', () => {
  it('deny client read and write', async () => {
    const db = testEnv.authenticatedContext('user_1').firestore()
    await assertFails(db.doc('qualified_events/e1').get())
    await assertFails(db.doc('fraud_flags/f1').get())
    await assertFails(db.doc('production_flags/p1').get())
    await assertFails(db.doc('partner_sensitive/s1').get())
  })
})

describe('users/{uid}', () => {
  it('lets the owner read/update their own whitelisted fields', async () => {
    const db = testEnv.authenticatedContext('user_1').firestore()
    await assertSucceeds(db.doc('users/user_1').set({ nonPersonalizedMode: false, consent: 'unset', createdAt: Date.now() }))
    await assertSucceeds(db.doc('users/user_1').update({ consent: 'granted' }))
  })

  it('denies writing a non-whitelisted field, e.g. isInternalTestUser', async () => {
    const db = testEnv.authenticatedContext('user_1').firestore()
    await assertFails(db.doc('users/user_1').update({ isInternalTestUser: true }))
  })

  it('denies reading/writing another user\'s doc', async () => {
    const db = testEnv.authenticatedContext('user_1').firestore()
    await assertFails(db.doc('users/user_2').get())
    await assertFails(db.doc('users/user_2').update({ consent: 'granted' }))
  })
})

describe('default deny', () => {
  it('denies an arbitrary unlisted path', async () => {
    const db = testEnv.authenticatedContext('user_1').firestore()
    await assertFails(db.doc('something_unlisted/doc1').get())
  })
})
