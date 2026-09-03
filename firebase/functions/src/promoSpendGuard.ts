import { getFirestore } from 'firebase-admin/firestore'
import { computeSpendCents, nextPromoStatus, type PromoStatus, type RateCardCents } from './promoBilling.js'

type CounterField = 'clicksCount' | 'engagementsCount'

/**
 * Shared by fraudScoring.ts (clicks) and promoSpendTracker.ts
 * (engagements) — the only two writers of a promo campaign's counters.
 * Atomically bumps one counter by 1, recomputes spend, and applies
 * promoBilling.ts's status transition (auto-exhausts + hides the campaign,
 * via the existing `active` flag / syncPublicCreative trigger, once spend
 * reaches its prepaid amount; leaves a manual pause alone). No-ops
 * silently for a missing, non-promo, or malformed doc — the two callers
 * don't need to know or care which; promo-billing-report.mjs is what
 * surfaces a malformed promo doc as an irregularity, not this hot path.
 */
export async function bumpPromoCounter(creativeId: string, field: CounterField): Promise<void> {
  const db = getFirestore()
  const ref = db.collection('ad_creatives').doc(creativeId)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return
    const data = snap.data() as Record<string, unknown>
    if (data.placement !== 'promo') return

    const rateCard = data.rateCardCents as RateCardCents | undefined
    if (!rateCard) return

    const clicksCount = (typeof data.clicksCount === 'number' ? data.clicksCount : 0) + (field === 'clicksCount' ? 1 : 0)
    const engagementsCount =
      (typeof data.engagementsCount === 'number' ? data.engagementsCount : 0) + (field === 'engagementsCount' ? 1 : 0)
    const prepaidAmountCents = typeof data.prepaidAmountCents === 'number' ? data.prepaidAmountCents : 0
    const currentStatus: PromoStatus = (data.status as PromoStatus | undefined) ?? 'active'

    const spentCents = computeSpendCents(clicksCount, engagementsCount, rateCard)
    const status = nextPromoStatus(currentStatus, prepaidAmountCents, spentCents)

    tx.set(
      ref,
      {
        [field]: field === 'clicksCount' ? clicksCount : engagementsCount,
        spentCents,
        status,
        active: status === 'active',
        updatedAt: new Date(),
      },
      { merge: true },
    )
  })
}
