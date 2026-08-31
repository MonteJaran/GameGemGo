export type ConsentState = 'unset' | 'granted' | 'denied'

export interface LocalUserProfile {
  uid: string
  createdAt: number
  /** Internal/QA traffic must never be revenue-eligible — see env.ts and qualificationEngine.ts. */
  isInternalTestUser: boolean
  nonPersonalizedMode: boolean
  consent: ConsentState
}
