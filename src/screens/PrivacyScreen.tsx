import { useRouter } from '../router/router'

/**
 * Real copy (not lorem-ipsum placeholder), describing what the app
 * actually does in both local_test and the planned Phase 2 behavior — kept
 * in sync with the public hosted version an app-store listing should link
 * to. Accuracy to the actual code matters more than sounding minimal: a
 * privacy policy that claims less data collection than the app really does
 * is a bigger liability than one that's fully honest about it.
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
          GameGemGo is developed and operated by Dejan Radoman ("we", "us"), a general-audience app
          (teen and up) for discovering playable game ad previews. This policy explains what we
          collect, why, and the choices you have. It is not directed at children, and we do not
          knowingly collect personal information from anyone under 13 (or the applicable age of
          digital consent in your region).
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
          to a game's page. This is collected continuously while you use the feed, not only at the
          moment you tap something — we use it to measure genuine engagement and to detect invalid
          or automated (bot) activity, not to build an advertising profile of you.
        </p>
        <p>
          <strong>Basic device/technical data</strong> — things like app version and coarse timing
          information, for the same fraud-prevention purpose above. Where we check request
          origin for abuse prevention, any IP address involved is hashed before storage — we don't
          keep or expose raw IP addresses.
        </p>
        <p>We do not collect your contacts, precise location, photos, or microphone/camera data.</p>

        <h2>What a promoted app's company actually receives</h2>
        <p>
          An advertiser or promoted app never receives anything about you unless you actually open
          or engage with <em>their specific</em> content — nothing is shared with a partner just
          because their card was shown to you. Even then, what they receive is an aggregate,
          anonymous engagement/fraud signal (e.g. "this creative was genuinely played, from a
          non-fraudulent session") for campaign reporting, never anything that identifies you
          personally. This can include aggregate timing/behavior patterns for that creative
          specifically — for example what fraction of sessions exit within the first few seconds,
          or how many reach genuine engagement — computed across many sessions together, so a
          developer can improve their playable's performance without ever seeing anything about one
          identifiable visit.
        </p>

        <h2>Playable ad content &amp; partners</h2>
        <p>
          The playable previews you try are either bundled with the app (clearly local demo
          content) or, when sourced from an advertising partner, loaded from that partner's own
          content. A partner's playable may independently collect interaction data under its own
          privacy terms while it's open on screen; we'll name our active partners and link their
          policies here once real partner inventory is live.
        </p>

        <h2>What we don't do</h2>
        <p>
          We don't sell your data. We don't build cross-app advertising profiles. We don't collect
          anything tied to a real-world identity unless you're an internal test user (a status only
          we can set, never toggled by the app itself).
        </p>

        <h2>California privacy rights</h2>
        <p>
          We do not sell or share personal information, as those terms are defined under California
          law. If that ever changes (e.g. once a third-party ad network is integrated), we'll add a
          "Do Not Sell or Share My Personal Information" control here before it does. California
          residents can still ask us to know or delete what little anonymous data exists for their
          device via the contact below.
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
          <a href="mailto:dejanradoman00@gmail.com" style={{ fontFamily: 'monospace' }}>
            dejanradoman00@gmail.com
          </a>
          .
        </p>

        <p style={{ color: 'var(--color-text-faint)', fontSize: 12, marginTop: 32 }}>
          Last updated September 2026.
        </p>
      </div>
    </div>
  )
}
