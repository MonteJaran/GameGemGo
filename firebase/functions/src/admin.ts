import { initializeApp, getApps } from 'firebase-admin/app'

// Imported once, for its side effect, before any other function module.
if (getApps().length === 0) {
  initializeApp()
}
