/**
 * Pure math for promo (prepaid sponsor) campaigns — no Firestore/Admin SDK
 * imports here on purpose, so `promoSpendTracker.ts`, the `fraudScoring.ts`
 * click hook, and `scripts/promo-billing-report.mjs` can't drift apart on
 * "how do we compute spend" even though the standalone script can't import
 * this compiled-TS package directly (see that script's header comment —
 * same "kept in sync by hand" tradeoff this repo already accepts between
 * qualificationEngine.ts and qualifyEvents.ts's threshold constants).
 *
 * All money is integer cents — never floats — for the same reason
 * everything else in this codebase avoids float currency math: repeated
 * increments must not accumulate rounding drift over a campaign's lifetime.
 */

export interface RateCardCents {
  perClickCents: number
  perEngagementCents: number
}

export type PromoStatus = 'active' | 'paused' | 'exhausted'

export function computeSpendCents(clicksCount: number, engagementsCount: number, rateCard: RateCardCents): number {
  return clicksCount * rateCard.perClickCents + engagementsCount * rateCard.perEngagementCents
}

export function remainingCents(prepaidAmountCents: number, spentCents: number): number {
  return prepaidAmountCents - spentCents
}

/**
 * A manual 'paused' status always wins and is never auto-resumed by a
 * trigger — only a human (via `addPromoGame`) un-pauses a campaign.
 * Otherwise: exhausted once spend reaches the prepaid amount, active
 * before that. This is the only place that decides the status transition —
 * both spend-tracking hooks (engagements in promoSpendTracker.ts, clicks in
 * fraudScoring.ts) call it instead of each re-deriving the rule.
 */
export function nextPromoStatus(currentStatus: PromoStatus, prepaidAmountCents: number, spentCents: number): PromoStatus {
  if (currentStatus === 'paused') return 'paused'
  return spentCents >= prepaidAmountCents ? 'exhausted' : 'active'
}
