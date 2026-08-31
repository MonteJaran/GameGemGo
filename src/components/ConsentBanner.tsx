import { useEffect, useState } from 'react'
import { getConsentState, setConsentState, setNonPersonalizedMode } from '../services/privacy/privacyConsentService'
import { useRouter } from '../router/router'
import { Button } from './Button'

/**
 * First-run consent prompt (GDPR/EEA-ready architecture per spec). Shown
 * to everyone by default — there's no geo-IP lookup here to scope it to
 * EEA/UK users only (that would need a server-side check); this errs
 * toward always-asking rather than silently skipping consent for anyone.
 * No personalized advertising is served in this build regardless of the
 * choice made here — see PrivacyScreen.
 *
 * Deferred (checks state from an effect via requestAnimationFrame, same
 * pattern as HomeFeedScreen's feed_rendered log) so it never delays first
 * paint, and rendered small/bottom-anchored so it can't be mistaken for a
 * blocking/deceptive overlay.
 */
export function ConsentBanner() {
  const { navigate } = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (getConsentState() === 'unset') setVisible(true)
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  if (!visible) return null

  function acceptAll() {
    setConsentState('granted')
    setNonPersonalizedMode(false)
    setVisible(false)
  }

  function nonPersonalizedOnly() {
    setConsentState('granted')
    setNonPersonalizedMode(true)
    setVisible(false)
  }

  return (
    <div className="consent-banner" role="dialog" aria-label="Privacy choices">
      <p className="consent-banner__text">
        We use anonymous, non-identifying data to run the feed and keep it fair. No personalized
        ads are served in this build either way — see{' '}
        <button
          className="consent-banner__link"
          onClick={() => {
            setVisible(false)
            navigate({ name: 'privacy' })
          }}
        >
          Privacy
        </button>
        .
      </p>
      <div className="consent-banner__actions">
        <Button variant="secondary" onClick={nonPersonalizedOnly} className="tap-target">
          Non-personalized only
        </Button>
        <Button variant="primary" onClick={acceptAll} className="tap-target">
          Accept
        </Button>
      </div>
    </div>
  )
}
