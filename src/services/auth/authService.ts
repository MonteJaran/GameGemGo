import { env } from '../../config/env'
import type { LocalUserProfile } from '../../types/user'
import { newId } from '../../utils/id'

const STORAGE_KEY = 'swipeplayable:profile:v1'

function readStoredProfile(): LocalUserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LocalUserProfile) : null
  } catch {
    return null
  }
}

function persistProfile(profile: LocalUserProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // storage unavailable (private mode, quota) — app still works, just won't remember the uid across reloads
  }
}

function createProfile(uid: string = newId('anon')): LocalUserProfile {
  return {
    uid,
    createdAt: Date.now(),
    isInternalTestUser: env.isInternalTestUser,
    nonPersonalizedMode: false,
    consent: 'unset',
  }
}

function localFallback(): LocalUserProfile {
  const existing = readStoredProfile()
  const profile = existing ?? createProfile()
  if (!existing) persistProfile(profile)
  return profile
}

let cached: LocalUserProfile | null = null

/**
 * Adapter boundary: local_test mode mints and persists a fake anonymous uid
 * in localStorage — no network, no Firebase SDK loaded at all. Staging/
 * production sign in for real via Firebase Auth (dynamically imported —
 * see services/firebase/firebaseClient.ts) and fall back to the same local
 * profile if that fails for any reason (FAILSAFE REQUIREMENTS: the app
 * must keep working if Firebase is unreachable).
 */
export async function ensureSignedIn(): Promise<LocalUserProfile> {
  if (cached) return cached

  if (env.isLocalTest) {
    cached = localFallback()
    return cached
  }

  try {
    const [{ getFirebaseAuth, getFirebaseDb }, { signInAnonymously }, { doc, setDoc, getDoc }] = await Promise.all([
      import('../firebase/firebaseClient'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ])

    const credential = await signInAnonymously(getFirebaseAuth())
    const uid = credential.user.uid

    const existingLocal = readStoredProfile()
    const profile: LocalUserProfile = {
      uid,
      createdAt: existingLocal?.uid === uid ? existingLocal.createdAt : Date.now(),
      isInternalTestUser: env.isInternalTestUser,
      nonPersonalizedMode: existingLocal?.uid === uid ? existingLocal.nonPersonalizedMode : false,
      consent: existingLocal?.uid === uid ? existingLocal.consent : 'unset',
    }
    persistProfile(profile)
    cached = profile

    // Best-effort: make sure users/{uid} exists so Cloud Functions have
    // somewhere real to read isInternalTestUser from (server-set only —
    // this create only ever writes the harmless whitelist, see
    // firestore.rules) and so privacyConsentService's writes land on a doc
    // that already exists.
    const db = getFirebaseDb()
    const userRef = doc(db, 'users', uid)
    const userSnap = await getDoc(userRef)
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        createdAt: profile.createdAt,
        nonPersonalizedMode: profile.nonPersonalizedMode,
        consent: profile.consent,
      })
    }

    return profile
  } catch (err) {
    console.warn('[authService] Firebase anonymous auth failed — falling back to local profile.', err)
    cached = localFallback()
    return cached
  }
}

export function getCurrentProfile(): LocalUserProfile | null {
  return cached ?? readStoredProfile()
}

export function updateProfile(patch: Partial<LocalUserProfile>): LocalUserProfile {
  const current = getCurrentProfile() ?? createProfile()
  const next = { ...current, ...patch }
  persistProfile(next)
  cached = next

  if (!env.isLocalTest) {
    void syncProfileToFirestore(next)
  }

  return next
}

async function syncProfileToFirestore(profile: LocalUserProfile) {
  try {
    const [{ getFirebaseDb }, { doc, setDoc }] = await Promise.all([
      import('../firebase/firebaseClient'),
      import('firebase/firestore'),
    ])
    // Only the whitelist firestore.rules allows an owner to write —
    // isInternalTestUser is deliberately excluded, it's server-set only.
    await setDoc(
      doc(getFirebaseDb(), 'users', profile.uid),
      { nonPersonalizedMode: profile.nonPersonalizedMode, consent: profile.consent },
      { merge: true },
    )
  } catch (err) {
    console.warn('[authService] Failed to sync profile to Firestore (will retry on next change).', err)
  }
}
