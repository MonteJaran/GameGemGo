#!/usr/bin/env node
/**
 * Read-only billing + irregularity report for promo (prepaid sponsor)
 * campaigns: for each one, how many clicks/engagements it generated, what
 * that computes to against its rate card, and what's left of what was
 * paid up front — plus a handful of sanity checks that flag anything that
 * looks off. Never writes anything.
 *
 * Needs a service account key (Firebase Console > Project settings >
 * Service accounts > Generate new private key) — never commit that file,
 * point GOOGLE_APPLICATION_CREDENTIALS at it locally. Same auth pattern as
 * set-production-flag.mjs / set-admin-claim.mjs in this folder.
 *
 * Usage (every promo campaign):
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
 *     node scripts/promo-billing-report.mjs
 *
 * Usage (one campaign only):
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
 *     node scripts/promo-billing-report.mjs promo-acme-2026-09
 *
 * The spend formula below is a deliberate, byte-for-byte copy of
 * functions/src/promoBilling.ts's computeSpendCents/nextPromoStatus — this
 * script runs as plain standalone Node (not the compiled functions
 * bundle), so it can't import that TS source directly. This is the same
 * "kept in sync by hand" tradeoff already used elsewhere in this repo
 * (see qualifyEvents.ts's comment about qualificationEngine.ts's
 * thresholds) — if the money math in promoBilling.ts ever changes, change
 * it here too.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function computeSpendCents(clicksCount, engagementsCount, rateCard) {
  return clicksCount * rateCard.perClickCents + engagementsCount * rateCard.perEngagementCents
}

/** Mirrors promoBilling.ts's nextPromoStatus, used here only to check the stored status against what the numbers imply — never to write anything back. */
function expectedStatus(currentStatus, remainingCents) {
  if (currentStatus === 'paused') return 'paused'
  return remainingCents <= 0 ? 'exhausted' : 'active'
}

function euros(cents) {
  return `€${(cents / 100).toFixed(2)}`
}

const [, , onlyCreativeId] = process.argv

initializeApp({ credential: applicationDefault() })
const db = getFirestore()

const docs = onlyCreativeId
  ? await db
      .collection('ad_creatives')
      .doc(onlyCreativeId)
      .get()
      .then((d) => (d.exists ? [d] : []))
  : await db
      .collection('ad_creatives')
      .where('placement', '==', 'promo')
      .get()
      .then((s) => s.docs)

if (docs.length === 0) {
  console.log(onlyCreativeId ? `No promo campaign found with id "${onlyCreativeId}".` : 'No promo campaigns found.')
  process.exit(0)
}

let anyIrregularity = false
function flag(message) {
  console.log(`  IRREGULARITY: ${message}`)
  anyIrregularity = true
}

for (const doc of docs) {
  const d = doc.data()
  console.log('\n' + '='.repeat(64))
  console.log(`${d.title ?? '(untitled)'}  [${doc.id}]`)
  console.log(
    `  sponsor: ${d.partnerLabel ?? '(none)'}   tier: ${d.promoTier ?? '(none)'}   status: ${d.status ?? '(missing)'}   visible in feed: ${d.active === true}`,
  )

  if (d.placement !== 'promo') {
    flag('fetched by id but placement is not "promo" — not a promo campaign, skipping billing math.')
    continue
  }

  const rateCard = d.rateCardCents
  const prepaidAmountCents = d.prepaidAmountCents
  const clicksCount = typeof d.clicksCount === 'number' ? d.clicksCount : 0
  const engagementsCount = typeof d.engagementsCount === 'number' ? d.engagementsCount : 0

  if (!rateCard || typeof rateCard.perClickCents !== 'number' || typeof rateCard.perEngagementCents !== 'number') {
    flag('missing/malformed rateCardCents — cannot compute spend for this campaign.')
    continue
  }
  if (typeof prepaidAmountCents !== 'number') {
    flag('missing/malformed prepaidAmountCents — cannot compute remaining balance.')
    continue
  }

  const recomputedSpentCents = computeSpendCents(clicksCount, engagementsCount, rateCard)
  const remaining = prepaidAmountCents - recomputedSpentCents

  console.log(`  rate card: ${euros(rateCard.perClickCents)}/click, ${euros(rateCard.perEngagementCents)}/engagement`)
  console.log(`  prepaid: ${euros(prepaidAmountCents)}`)
  console.log(`  clicks: ${clicksCount}   engagements: ${engagementsCount}`)
  console.log(`  spent (recomputed from raw counts): ${euros(recomputedSpentCents)}`)
  console.log(`  remaining: ${euros(remaining)}`)

  // --- Irregularity checks ---
  if (typeof d.spentCents === 'number' && d.spentCents !== recomputedSpentCents) {
    flag(
      `stored spentCents (${euros(d.spentCents)}) does not match recomputed spend (${euros(recomputedSpentCents)}) — possible drift, a failed trigger run, or a manual Firestore edit.`,
    )
  }
  if (remaining < 0) {
    flag(
      `overspent by ${euros(-remaining)} — should be impossible if auto-exhaustion is working (see promoBilling.ts's nextPromoStatus / promoSpendGuard.ts). Investigate before this campaign is topped up or billed further.`,
    )
  }
  const expected = expectedStatus(d.status, remaining)
  if (d.status && d.status !== expected) {
    flag(`stored status "${d.status}" does not match what the numbers imply ("${expected}").`)
  }
  if (typeof d.active === 'boolean' && d.active !== (d.status === 'active')) {
    flag(`active=${d.active} is inconsistent with status="${d.status}" — feed visibility and billing status have drifted apart.`)
  }
  if (clicksCount >= 20 && engagementsCount === 0) {
    flag(`${clicksCount} clicks but 0 qualified engagements — unusually low for real traffic; worth a manual look.`)
  }

  const fraudSnap = await db.collection('fraud_flags').where('creativeId', '==', doc.id).get()
  if (!fraudSnap.empty) {
    const reasonCounts = {}
    for (const f of fraudSnap.docs) {
      for (const r of f.data().reasons ?? []) reasonCounts[r] = (reasonCounts[r] ?? 0) + 1
    }
    flag(`${fraudSnap.size} fraud_flags recorded against this creative — reasons: ${JSON.stringify(reasonCounts)}`)
  }
}

console.log('\n' + '='.repeat(64))
console.log(anyIrregularity ? 'Done — one or more irregularities flagged above.' : 'Done — nothing irregular found.')
