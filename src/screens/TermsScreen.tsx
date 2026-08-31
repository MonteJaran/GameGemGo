import { useRouter } from '../router/router'

/**
 * Real draft copy (not lorem-ipsum placeholder). Still flagged as a draft
 * at the bottom — get an actual legal review before any public release.
 */
export function TermsScreen() {
  const { back } = useRouter()
  return (
    <div className="screen">
      <div className="screen-header">
        <button className="icon-button tap-target" onClick={back} aria-label="Back">
          ←
        </button>
        <h1 className="screen-header__title">Terms</h1>
      </div>
      <div className="screen__scroll prose">
        <p>By opening or using SwipePlayable, you agree to these terms.</p>

        <h2>What this app is</h2>
        <p>
          SwipePlayable is a general-audience (teen and up) app for discovering playable game ad
          previews. Test builds ship with local demo playables only and no real ad inventory; when
          you see "Internal Demo" on a card, that content isn't from a real advertising partner and
          any "Open Game Page" link goes to an in-app placeholder, not a real store listing.
        </p>

        <h2>Eligibility</h2>
        <p>
          This app is not directed at children and shouldn't be used by anyone under 13 (or the
          applicable minimum age in your region) without a parent/guardian's involvement.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Don't attempt to interfere with, automate, or manipulate the app's engagement or
          fraud-detection systems — including scripted taps, emulated/bot traffic, or repeatedly
          triggering outbound clicks without genuine engagement. Accounts or devices found doing
          this may be excluded from future features, including any monetized ones.
        </p>

        <h2>Playable content &amp; third parties</h2>
        <p>
          Playable previews from advertising partners are that partner's content, shown through
          this app's sandboxed preview. We aim to keep partner content free of deceptive or
          accidental-click design, but we don't control what a partner's playable does once it's
          on screen — report anything that looks wrong via the contact below.
        </p>

        <h2>No warranty</h2>
        <p>
          This app is provided "as is." We don't guarantee it will be uninterrupted, error-free, or
          fit for a particular purpose. Playable demo content is for preview/entertainment
          purposes only.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the extent permitted by law, we aren't liable for indirect, incidental, or
          consequential damages arising from your use of the app.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms as the app evolves (e.g. moving from test to production
          monetization). Continued use after an update means you accept the revised terms.
        </p>

        <h2>Contact</h2>
        <p>
          Questions? Reach us at <span style={{ fontFamily: 'monospace' }}>legal@example.com</span>{' '}
          (placeholder — set a real contact address before public release).
        </p>

        <p style={{ color: 'var(--color-text-faint)', fontSize: 12, marginTop: 32 }}>
          Draft — last reviewed for accuracy against the current build, not yet reviewed by
          counsel. Replace this line once that review happens.
        </p>
      </div>
    </div>
  )
}
