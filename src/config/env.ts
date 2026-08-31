import type { EnvironmentMode } from '../types/environment'

/**
 * Single source of truth for "which mode is this build in". Read once at
 * module load (cheap, synchronous, no I/O) — everything else imports this
 * instead of touching import.meta.env directly.
 */
const mode: EnvironmentMode = (import.meta.env.VITE_APP_ENV as EnvironmentMode) || 'local_test'

const isInternalTestUser = import.meta.env.VITE_INTERNAL_TEST_USER === 'true'

export const env = {
  mode,
  isLocalTest: mode === 'local_test',
  isStaging: mode === 'staging',
  isProduction: mode === 'production',

  /** Internal/QA builds only — flip off automatically outside local_test/staging. */
  isInternalTestUser: mode === 'production' ? isInternalTestUser && false : isInternalTestUser,

  /** Debug screen must never ship enabled in production builds. */
  debugScreenEnabled: mode !== 'production',

  /** Creative source: local seed in test mode, Firestore afterwards (Phase 2). */
  creativeSource: mode === 'local_test' ? ('local' as const) : ('firebase' as const),
} as const

export type Env = typeof env
