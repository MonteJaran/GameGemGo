import { useRouter } from '../router/router'

/**
 * Real draft copy (not lorem-ipsum placeholder), describing what the app
 * actually does in both local_test and the planned Phase 2 behavior. Still
 * flagged as a draft at the bottom — get an actual legal review before any
 * public release; this is a strong starting point, not legal advice.
 */
export function PrivacyScreen() {
  const { back } = useRouter()
  return (
    <div className="screen">
      <div className="screen-header">
        <button className="icon-button tap-target" onClick={back} aria-label="Back">
          ←
        </button>
        <h1 className="screen-header__title">Privacy</h1>
      </div>
      <div className="screen__scroll prose">
        <p>
          SwipePlayable is a general-audience app (teen and up) for discovering playable game ad
          previews. This policy explains what we collect, why, and the choices you have. It is not
          directed at children, and we do not knowingly collect personal information from anyone
          under 13 (or the applicable age of digital consent in your region).
        </p>

        <h2>Account</h2>
        <p>
          You are never asked for a name, email, or password. On first open, the app creates an
          anonymous account for you (an anonymous Firebase identifier) so we can keep your
          settings and engagement history consistent without knowing who you are.
        </p>

        <h2>What we collect</h2>
        <p>
          <strong>Interaction events</strong> — which cards you were shown, whether you opened a
          playable preview, how long you actively engaged with it, and whether you tapped through
          to a game's page. We use this to measure genuine engagement and to detect invalid or
          automated (bot) activity, not to build an advertising profile of you.
        </p>
        <p>
          <strong>Basic device/technical data</strong> — things like app version and coarse timing
          information, for the same fraud-prevention purpose above. Where we check request
          origin for abuse prevention, any IP address involved is hashed before storage — we don't
          keep or expose raw IP addresses.
        </p>
        <p>We do not collect your contacts, precise location, photos, or microphone/camera data.</p>

        <h2>Playable ad content &amp; partners</h2>
        <p>
          The playable previews you try are either bundled with the app (clearly local demo
          content) or, when sourced from an advertising partner, loaded from that partner's own
          content. A partner's playable may independently collect interaction data under its own
          privacy terms while it's open on screen; we'll name our active partners and link their
          policies here once real partner inventory is live. We do not share anything that
          identifies you personally with partners — only aggregate engagement/fraud signals needed
          for campaign reporting.
        </p>

        <h2>What we don't do</h2>
        <p>
          We don't sell your data. We don't build cross-app advertising profiles. We don't collect
          anything tied to a real-world identity unless you're an internal test user (a status only
          we can set, never toggled by the app itself).
        </p>

        <h2>Your choices</h2>
        <p>
          <strong>Non-personalized mode</strong> — available now in Profile &amp; Settings.
          <strong> Consent management</strong> — a region-aware consent prompt for users in the
          EEA/UK is planned before this app leaves test mode; until then, no personalized
          advertising is served anywhere in the app. You can ask us to delete your anonymous
          account's data at any time using the contact info below.
        </p>

        <h2>Data retention</h2>
        <p>
          Interaction events are kept only as long as needed for fraud prevention and product
          improvement, then deleted or aggregated. Local, on-device data (like your Debug/Profile
          view in test builds) stays on your device and clears if you clear the app's storage.
        </p>

        <h2>Security</h2>
        <p>
          Access to anything beyond your own anonymous account is restricted server-side; the app
          itself never has write access to ad inventory, fraud results, or other users' data.
        </p>

        <h2>Changes to this policy</h2>
        <p>We'll update the date below whenever this policy materially changes.</p>

        <h2>Contact</h2>
        <p>
          Questions or a deletion request? Reach us at{' '}
          <span style={{ fontFamily: 'monospace' }}>privacy@example.com</span> (placeholder — set a
          real contact address before public release).
        </p>

        <p style={{ color: 'var(--color-text-faint)', fontSize: 12, marginTop: 32 }}>
          Draft — last reviewed for accuracy against the current build, not yet reviewed by
          counsel. Replace this line once that review happens.
        </p>
      </div>
    </div>
  )
}
