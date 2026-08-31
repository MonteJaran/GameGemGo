/**
 * Phase 2 entry point into the real Firebase SDK.
 *
 * IMPORTANT: never `import` this module at the top level of app code. It
 * must only be reached through a dynamic `import('./firebaseClient')` from
 * authService / feedService / eventLogger, gated on `!env.isLocalTest`. That
 * keeps `firebase/app`, `firebase/auth`, `firebase/firestore` out of the
 * cold-start bundle entirely for local_test builds (see
 * vite.config.ts's `vendor-firebase` chunk).
 */
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getFunctions, type Functions } from 'firebase/functions'
import { firebaseConfig, hasFirebaseConfig } from '../../config/firebaseConfig'

let app: FirebaseApp | undefined
let authInstance: Auth | undefined
let dbInstance: Firestore | undefined
let functionsInstance: Functions | undefined

function getFirebaseApp(): FirebaseApp {
  if (!hasFirebaseConfig()) {
    throw new Error(
      '[firebaseClient] Missing Firebase config. Fill in .env (VITE_FIREBASE_*) — see .env.example.',
    )
  }
  if (!app) app = initializeApp(firebaseConfig)
  return app
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getFirebaseApp())
  return authInstance
}

export function getFirebaseDb(): Firestore {
  if (!dbInstance) dbInstance = getFirestore(getFirebaseApp())
  return dbInstance
}

export function getFirebaseFunctions(): Functions {
  if (!functionsInstance) functionsInstance = getFunctions(getFirebaseApp())
  return functionsInstance
}
