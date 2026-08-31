import { getCurrentProfile, updateProfile } from '../auth/authService'
import type { ConsentState } from '../../types/user'

/**
 * Placeholder consent/privacy service. Good enough for local_test/staging;
 * NOT a real CMP. Before shipping to production in the EEA/UK, replace
 * getConsentState/setConsentState's storage with (or gate them behind) a
 * real consent management platform — e.g. Google's User Messaging Platform
 * — so ad personalization and analytics collection are held back until the
 * user has actually responded to a consent prompt.
 */
export function getConsentState(): ConsentState {
  return getCurrentProfile()?.consent ?? 'unset'
}

export function setConsentState(consent: ConsentState) {
  updateProfile({ consent })
}

export function isNonPersonalizedMode(): boolean {
  return getCurrentProfile()?.nonPersonalizedMode ?? false
}

export function setNonPersonalizedMode(enabled: boolean) {
  updateProfile({ nonPersonalizedMode: enabled })
}
