import './admin.js'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { computeSpendCents, nextPromoStatus, type PromoStatus, type RateCardCents } from './promoBilling.js'

const GENRES = new Set(['runner', 'puzzle', 'strategy'])
const PROMO_TIERS = new Set(['gold', 'emerald'])

interface ValidatedInput {
  creativeId: string
  title: string
  genre: string
  thumbnail: Record<string, unknown>
  partnerLabel: string | null
  promoTier: 'gold' | 'emerald'
  priority: number
  playableEntry: string
  ctaValue: string
  prepaidAmountCents: number
  rateCardCents: RateCardCents
  requestedStatus: PromoStatus | null
}

function isNonEmptyString(v: unknown, maxLen: number): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= maxLen
}

function isNonNegativeInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0
}

/**
 * Manual field-by-field checks, same style as logRawEvent.ts — this repo
 * has no schema-validation library and one small admin-only endpoint isn't
 * reason to add one. Returns either the validated+normalized input or a
 * list of human-readable problems (surfaced verbatim in the thrown error,
 * since only the site owner ever calls this).
 */
function validate(data: Record<string, unknown>): { ok: true; value: ValidatedInput } | { ok: false; errors: string[] } {
  const errors: string[] = []

  if (!isNonEmptyString(data.creativeId, 128) || !/^[a-zA-Z0-9_-]+$/.test(data.creativeId)) {
    errors.push('creativeId must be a non-empty string of letters/numbers/-/_ (max 128 chars).')
  }
  if (!isNonEmptyString(data.title, 200)) errors.push('title is required (max 200 chars).')
  if (typeof data.genre !== 'string' || !GENRES.has(data.genre)) {
    errors.push(`genre must be one of: ${[...GENRES].join(', ')}.`)
  }
  if (!data.thumbnail || typeof data.thumbnail !== 'object') {
    errors.push('thumbnail is required — { kind: "placeholder-gradient", from, to, glyph } or { kind: "image", url, from, to, glyph }.')
  }
  if (data.partnerLabel !== undefined && data.partnerLabel !== null && !isNonEmptyString(data.partnerLabel, 120)) {
    errors.push('partnerLabel, if given, must be a non-empty string (max 120 chars).')
  }
  if (data.promoTier !== undefined && (typeof data.promoTier !== 'string' || !PROMO_TIERS.has(data.promoTier))) {
    errors.push('promoTier, if given, must be "gold" or "emerald".')
  }
  if (data.priority !== undefined && typeof data.priority !== 'number') {
    errors.push('priority, if given, must be a number.')
  }
  if (!isNonEmptyString(data.playableEntry, 2048)) errors.push('playableEntry (the game URL) is required.')
  if (!isNonEmptyString(data.ctaValue, 2048)) errors.push('ctaValue (the "Open Game Page" target URL) is required.')
  if (!isNonNegativeInt(data.prepaidAmountCents)) errors.push('prepaidAmountCents must be a non-negative integer (whole cents — never a float).')

  const rc = data.rateCardCents as Record<string, unknown> | undefined
  if (!rc || !isNonNegativeInt(rc.perClickCents) || !isNonNegativeInt(rc.perEngagementCents)) {
    errors.push('rateCardCents must be { perClickCents, perEngagementCents }, both non-negative integers.')
  }

  let requestedStatus: PromoStatus | null = null
  if (data.status !== undefined) {
    if (data.status !== 'active' && data.status !== 'paused') {
      errors.push('status, if given, must be "active" or "paused" (never "exhausted" — that\'s computed, not set).')
    } else {
      requestedStatus = data.status
    }
  }

  if (errors.length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      creativeId: data.creativeId as string,
      title: data.title as string,
      genre: data.genre as string,
      thumbnail: data.thumbnail as Record<string, unknown>,
      partnerLabel: (data.partnerLabel as string | undefined) ?? null,
      promoTier: (data.promoTier as 'gold' | 'emerald' | undefined) ?? 'gold',
      priority: (data.priority as number | undefined) ?? 0,
      playableEntry: data.playableEntry as string,
      ctaValue: data.ctaValue as string,
      prepaidAmountCents: data.prepaidAmountCents as number,
      rateCardCents: {
        perClickCents: (rc as Record<string, number>).perClickCents,
        perEngagementCents: (rc as Record<string, number>).perEngagementCents,
      },
      requestedStatus,
    },
  }
}

/**
 * Admin-only: add a new promo (prepaid sponsor) game, or edit an existing
 * one by calling again with the same `creativeId` (e.g. top up
 * prepaidAmountCents, change the rate card, or pause/resume it). Never
 * touches `clicksCount`/`engagementsCount` on an edit — those are owned
 * exclusively by the spend-tracking hooks in fraudScoring.ts and
 * promoSpendTracker.ts, so a routine "raise the budget" call can't
 * accidentally reset a campaign's history.
 *
 * Writes straight to `ad_creatives` with the Admin SDK, same as every
 * other server-only write in this codebase — the existing
 * `syncPublicCreative` trigger (extended to forward `placement`/
 * `promoTier`/`priority`) is what actually publishes it, so this function
 * doesn't need its own publish step.
 *
 * Gated on the `admin` custom claim rather than a Firestore allowlist
 * doc — this is called rarely, by the site owner only, from a trusted
 * script (see scripts/set-admin-claim.mjs for the one-time setup); a
 * custom claim is the standard, simplest way to gate a callable like that.
 */
export const addPromoGame = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign-in required.')
  }
  if (request.auth.token.admin !== true) {
    throw new HttpsError(
      'permission-denied',
      'Only an account with the admin custom claim can add or edit promo games. See firebase/scripts/set-admin-claim.mjs.',
    )
  }

  const result = validate((request.data ?? {}) as Record<string, unknown>)
  if (!result.ok) {
    throw new HttpsError('invalid-argument', result.errors.join(' '))
  }
  const input = result.value

  const db = getFirestore()
  const ref = db.collection('ad_creatives').doc(input.creativeId)
  const existingSnap = await ref.get()
  const existing = existingSnap.exists ? (existingSnap.data() as Record<string, unknown>) : null

  const existingClicks = typeof existing?.clicksCount === 'number' ? existing.clicksCount : 0
  const existingEngagements = typeof existing?.engagementsCount === 'number' ? existing.engagementsCount : 0
  const statusBeforeThisCall: PromoStatus =
    input.requestedStatus ?? (existing?.status === 'paused' ? 'paused' : 'active')

  const spentCents = computeSpendCents(existingClicks, existingEngagements, input.rateCardCents)
  const status = nextPromoStatus(statusBeforeThisCall, input.prepaidAmountCents, spentCents)

  await ref.set(
    {
      title: input.title,
      genre: input.genre,
      thumbnail: input.thumbnail,
      badgeLabel: 'Playable Preview',
      partnerLabel: input.partnerLabel,
      playable: { kind: 'remote', entry: input.playableEntry },
      cta: { kind: 'external', value: input.ctaValue },
      placement: 'promo',
      promoTier: input.promoTier,
      priority: input.priority,
      prepaidAmountCents: input.prepaidAmountCents,
      rateCardCents: input.rateCardCents,
      // Only ever initialized here, never overwritten on an edit — the
      // spend-tracking hooks own these from this point on.
      ...(existingSnap.exists ? {} : { clicksCount: 0, engagementsCount: 0 }),
      spentCents,
      status,
      active: status === 'active',
      partnerId: null,
      payoutTermsRef: null,
      qualityScore: null,
      revenueFlags: null,
      updatedAt: new Date(),
      ...(existingSnap.exists ? {} : { createdAt: new Date() }),
    },
    { merge: true },
  )

  return { creativeId: input.creativeId, status, spentCents, remainingCents: input.prepaidAmountCents - spentCents }
})
