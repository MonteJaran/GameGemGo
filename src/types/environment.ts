/**
 * The three app behavior modes from the product spec. This is read once at
 * boot (see src/config/env.ts) and threaded through services instead of
 * scattered `if (import.meta.env...)` checks.
 */
export type EnvironmentMode = 'local_test' | 'staging' | 'production'
