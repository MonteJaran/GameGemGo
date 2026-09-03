import './admin.js'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'

/**
 * SKELETON. Projects only the client-safe fields from ad_creatives/{id}
 * into ad_creatives_public/{id} whenever the source doc changes — the
 * client never gets write access to either collection (see
 * ../../firestore.rules), so this Cloud Function is the only path a
 * creative can reach the public collection through.
 */
export const syncPublicCreative = onDocumentWritten('ad_creatives/{creativeId}', async (event) => {
  const after = event.data?.after?.data()
  const db = getFirestore()
  const publicRef = db.collection('ad_creatives_public').doc(event.params.creativeId)

  if (!after || after.active === false) {
    await publicRef.delete().catch(() => {})
    return
  }

  // Only the public-safe subset — see FIREBASE_SCHEMA.md's
  // ad_creatives_public table. Never forward partnerId, payoutTermsRef,
  // qualityScore, revenueFlags, or any promo money field (prepaidAmountCents,
  // rateCardCents, clicksCount, engagementsCount, spentCents, status) —
  // `placement`/`promoTier`/`priority` are purely presentational (which
  // plating to draw, what order to show in), never the sponsor's terms.
  const { title, genre, thumbnail, badgeLabel, partnerLabel, playable, cta, placement, promoTier, priority } =
    after as Record<string, unknown>
  await publicRef.set({
    title,
    genre,
    thumbnail,
    badgeLabel,
    partnerLabel: partnerLabel ?? null,
    playable,
    cta,
    // 'featured' has to pass through as-is, not collapse to 'network' —
    // it's what tells the client to scatter it randomly instead of
    // leaving it in place (feedService.ts's scatterFeatured). Anything
    // else (including absent) defaults to 'network'.
    placement: placement === 'promo' ? 'promo' : placement === 'featured' ? 'featured' : 'network',
    promoTier: promoTier ?? null,
    priority: typeof priority === 'number' ? priority : null,
    publishedAt: new Date(),
  })
})
