/**
 * Plain config object only — deliberately has zero `firebase/*` imports so
 * importing this file never pulls the Firebase SDK into the startup chunk.
 * The client config below is not a secret (Firestore/Storage security
 * rules + App Check are what actually gate access) but there is still no
 * reason to ship it inside the local_test bundle, so nothing reads it
 * unless env.mode !== 'local_test' (see services/firebase/firebaseClient.ts).
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export function hasFirebaseConfig(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)
}
