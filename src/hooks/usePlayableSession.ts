import { useEffect, useState } from 'react'
import { createPlayableSession, type PlayableSession } from '../services/session/playableSessionManager'

/**
 * Session creation lives in an effect (not during render) so it plays
 * correctly with React 18 StrictMode's dev-only double-invoke, and so a
 * session is never created as a render side effect. `session` is briefly
 * null on the very first render — screens should treat that as "not ready
 * yet" for gatekeeper-gated actions. Pass `null` for `creativeId` (e.g. the
 * feed has no current card — the end-of-batch state) to skip session
 * creation entirely instead of minting one for a nonexistent creative.
 */
export function usePlayableSession(creativeId: string | null): PlayableSession | null {
  const [session, setSession] = useState<PlayableSession | null>(null)

  useEffect(() => {
    if (!creativeId) {
      setSession(null)
      return
    }
    const s = createPlayableSession(creativeId)
    setSession(s)
    return () => {
      s.end('unknown')
    }
  }, [creativeId])

  return session
}
