#!/usr/bin/env node
/**
 * Bare-bones kill-switch tool for production_flags — no admin UI exists
 * yet, but an emergency flag flip shouldn't require writing a one-off
 * script under pressure. Needs a service account key (Firebase Console >
 * Project settings > Service accounts > Generate new private key) — never
 * commit that file; point GOOGLE_APPLICATION_CREDENTIALS at it locally.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
 *     node scripts/set-production-flag.mjs main pauseAllOutboundClicks true
 *
 * Reads current value first and asks for confirmation before writing.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createInterface } from 'node:readline/promises'

const [, , docId, field, rawValue] = process.argv

if (!docId || !field || rawValue === undefined) {
  console.error('Usage: node scripts/set-production-flag.mjs <docId> <field> <value>')
  console.error('Example: node scripts/set-production-flag.mjs main pauseAllOutboundClicks true')
  process.exit(1)
}

let value
try {
  value = JSON.parse(rawValue)
} catch {
  value = rawValue // plain strings are fine as-is
}

initializeApp({ credential: applicationDefault() })
const db = getFirestore()
const ref = db.collection('production_flags').doc(docId)

const before = (await ref.get()).data() ?? {}
console.log(`production_flags/${docId}.${field}: ${JSON.stringify(before[field])} -> ${JSON.stringify(value)}`)

const rl = createInterface({ input: process.stdin, output: process.stdout })
const answer = await rl.question('Write this change? [y/N] ')
rl.close()

if (answer.trim().toLowerCase() !== 'y') {
  console.log('Aborted, nothing written.')
  process.exit(0)
}

await ref.set({ [field]: value, updatedAt: new Date() }, { merge: true })
console.log('Done.')
