import { useRouter } from '../router/router'
import { SUBMISSION_FORM_URL, BUSINESS_CONTACT_EMAIL } from '../config/business'

/**
 * "Work with us" info screen — two audiences, kept clearly separate so
 * neither reads as a claim about the other:
 * - Game developers who want their game IN the feed (network/featured
 *   placement) — free during early access, submit via the form below.
 * - Companies who want a paid, pinned-to-top promo placement — no
 *   self-serve pricing yet, a "reach out" contact instead.
 * Mirrors firebase/public/advertise/index.html's copy — keep both in sync
 * by hand (that page is static HTML, can't import this screen's JSX).
 */
export function BusinessScreen() {
  const { back } = useRouter()
  return (
    <div className="screen">
      <div className="screen-header">
        <button className="icon-button tap-target" onClick={back} aria-label="Back">
          ←
        </button>
        <h1 className="screen-header__title">Business</h1>
      </div>
      <div className="screen__scroll prose">
        <p>GameGemGo is a swipe feed of playable game previews. There are two ways to get a game onto it.</p>

        <h2>Add your game to the feed — free during early access</h2>
        <p>
          We're always looking for real playable previews to feature — a normal spot in the feed, no
          gold frame, tracked the same way as everything else. While GameGemGo is in early access,
          there's no cost to get a game featured this way.
        </p>
        <p>
          <strong>Requirements:</strong> a single self-contained HTML file (all CSS/JS/assets inline —
          no external requests), playable inside a sandboxed <code>&lt;iframe sandbox="allow-scripts"&gt;</code>{' '}
          (no <code>allow-same-origin</code>, so don't rely on cookies/localStorage/parent-frame access), and
          a store/CTA link for what tapping through should open.{' '}
          <strong>5MB hard cap, 2MB or under strongly preferred</strong> — every extra megabyte is
          real wait time for a player on a weak connection before your game is even playable.
        </p>
        <p>
          <a href={SUBMISSION_FORM_URL} target="_blank" rel="noreferrer noopener">
            Submit your game →
          </a>
        </p>
        <p style={{ color: 'var(--color-text-dim)', fontSize: 13 }}>
          Prefer email? Reach out at{' '}
          <a href={`mailto:${BUSINESS_CONTACT_EMAIL}`} style={{ fontFamily: 'monospace' }}>
            {BUSINESS_CONTACT_EMAIL}
          </a>
          .
        </p>

        <h2>Promo (sponsored) placements</h2>
        <p>
          A promo placement is pinned to the top of the feed with a gold or emerald frame — always
          clearly marked, never disguised as regular content (see our <a href="#/privacy">Privacy</a>{' '}
          policy). It's a prepaid arrangement set per campaign, not a public price list — reach out and
          we'll work out terms together.
        </p>
        <p>
          <a href={`mailto:${BUSINESS_CONTACT_EMAIL}?subject=${encodeURIComponent('GameGemGo promo placement')}`}>
            {BUSINESS_CONTACT_EMAIL}
          </a>
        </p>

        <h2>Once your game is live</h2>
        <p>
          You'll be able to get an aggregate performance readout for your creative — things like when
          in the playthrough players tend to skip, how many reach genuine engagement, and average
          interactions before exit — never anything tied to an individual person, see our{' '}
          <a href="#/privacy">Privacy</a> policy. Useful for tuning your playable's opening hook or CTA.
        </p>
      </div>
    </div>
  )
}
