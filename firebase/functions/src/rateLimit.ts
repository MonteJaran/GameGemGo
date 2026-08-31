import { getFirestore, FieldValue } from 'firebase-admin/firestore'

/**
 * Fixed-window per-uid rate limiter backed by a single Firestore doc per
 * (uid, window, bucket) — cheap (one transactional read+write per call)
 * and good enough to stop flooding without needing Redis/Cloud Tasks.
 * Not exact (fixed windows allow a burst right at the boundary) but that's
 * an acceptable tradeoff for "stop abuse", not "meter precisely".
 */
export async function checkRateLimit(opts: {
  uid: string
  bucket: string
  limit: number
  windowMs: number
}): Promise<{ allowed: boolean; count: number }> {
  const db = getFirestore()
  const windowIndex = Math.floor(Date.now() / opts.windowMs)
  const ref = db.collection('rate_limits').doc(`${opts.uid}_${opts.bucket}_${windowIndex}`)

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const count = snap.exists ? ((snap.data()?.count as number | undefined) ?? 0) : 0

    if (count >= opts.limit) {
      return { allowed: false, count }
    }

    tx.set(
      ref,
      {
        count: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
        // Configure a Firestore TTL policy on this field (Console >
        // Firestore > TTL) so old rate-limit windows get swept
        // automatically instead of accumulating forever.
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      { merge: true },
    )
    return { allowed: true, count: count + 1 }
  })
}
