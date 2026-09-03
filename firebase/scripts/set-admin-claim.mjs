#!/usr/bin/env node
/**
 * One-time (or occasional) setup: grants the `admin` custom claim to a
 * Firebase Auth account — this is what functions/src/promoAdmin.ts's
 * `addPromoGame` callable checks before accepting a call, so you need to
 * run this once for whichever account will be adding/editing promo games.
 * Needs a service account key (Firebase Console > Project settings >
 * Service accounts > Generate new private key) — never commit that file;
 * point GOOGLE_APPLICATION_CREDENTIALS at it locally. Same auth pattern as
 * set-production-flag.mjs in this folder.
 *
 * Usage (by uid — from Firebase Console > Authentication, or your own
 * client's ensureSignedIn() result):
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
 *     node scripts/set-admin-claim.mjs --uid abc123
 *
 * Usage (by email instead, if the account has one):
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
 *     node scripts/set-admin-claim.mjs --email you@example.com
 *
 * Add --revoke to remove the claim instead of granting it. Reads the
 * account's current claims first and asks for confirmation before
 * writing, same as set-production-flag.mjs.
 *
 * NOTE: a custom claim only reaches an already-signed-in client on its
 * next ID token refresh (its own next sign-in, or a forced
 * getIdToken(true)) — not instantly.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { createInterface } from 'node:readline/promises'

const args = process.argv.slice(2)
const revoke = args.includes('--revoke')
const uidArg = args.includes('--uid') ? args[args.indexOf('--uid') + 1] : undefined
const emailArg = args.includes('--email') ? args[args.indexOf('--email') + 1] : undefined

if (!uidArg && !emailArg) {
  console.error('Usage: node scripts/set-admin-claim.mjs --uid <uid> | --email <email> [--revoke]')
  process.exit(1)
}

initializeApp({ credential: applicationDefault() })
const auth = getAuth()

const user = uidArg ? await auth.getUser(uidArg) : await auth.getUserByEmail(emailArg)
const before = user.customClaims ?? {}
const after = { ...before, admin: !revoke }

console.log(`${user.email ?? user.uid}: customClaims.admin ${before.admin ?? false} -> ${!revoke}`)

const rl = createInterface({ input: process.stdin, output: process.stdout })
const answer = await rl.question(`${revoke ? 'Revoke' : 'Grant'} admin for this account? [y/N] `)
rl.close()

if (answer.trim().toLowerCase() !== 'y') {
  console.log('Aborted, nothing written.')
  process.exit(0)
}

await auth.setCustomUserClaims(user.uid, after)
console.log('Done. The account needs a fresh ID token (sign out/in again, or getIdToken(true)) for this to take effect.')
