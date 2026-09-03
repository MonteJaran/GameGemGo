import { useMemo, useState } from 'react'
import { useRouter } from '../router/router'
import { getEventLog } from '../services/events/eventLogger'
import { getCurrentProfile } from '../services/auth/authService'
import { isNonPersonalizedMode, setNonPersonalizedMode } from '../services/privacy/privacyConsentService'
import { env } from '../config/env'

export function ProfileSettingsScreen() {
  const { navigate, back } = useRouter()
  const profile = getCurrentProfile()
  const events = getEventLog()
  const [nonPersonalized, setNonPersonalized] = useState(isNonPersonalizedMode())

  const stats = useMemo(
    () => ({
      viewed: events.filter((e) => e.name === 'card_visible_2s').length,
      opened: events.filter((e) => e.name === 'playable_open').length,
      qualified: events.filter((e) => e.name === 'qualified_engagement_candidate').length,
    }),
    [events],
  )

  function toggleNonPersonalized() {
    const next = !nonPersonalized
    setNonPersonalized(next)
    setNonPersonalizedMode(next)
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="icon-button tap-target" onClick={back} aria-label="Back">
          ←
        </button>
        <h1 className="screen-header__title">Profile & Settings</h1>
      </div>
      <div className="screen__scroll">
        <p style={{ color: 'var(--color-text-dim)', fontSize: 13 }}>
          Anonymous user · <span style={{ fontFamily: 'monospace' }}>{profile?.uid ?? 'unknown'}</span>
        </p>

        <div className="stat-grid">
          <div className="stat-tile">
            <div className="stat-tile__value">{stats.viewed}</div>
            <div className="stat-tile__label">Viewed</div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile__value">{stats.opened}</div>
            <div className="stat-tile__label">Opened</div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile__value">{stats.qualified}</div>
            <div className="stat-tile__label">Qualified</div>
          </div>
        </div>

        <div className="settings-section">
          <p className="settings-section__title">Privacy</p>
          <button className="settings-row" onClick={toggleNonPersonalized}>
            <span>
              <span className="settings-row__label">Non-personalized mode</span>
              <div className="settings-row__hint">Placeholder — will limit ad personalization in production</div>
            </span>
            <span className="switch" data-on={nonPersonalized} aria-hidden="true">
              <span className="switch__thumb" />
            </span>
          </button>
          <button className="settings-row" onClick={() => navigate({ name: 'privacy' })}>
            <span className="settings-row__label">Manage Privacy</span>
            <span aria-hidden="true">›</span>
          </button>
          <button className="settings-row" onClick={() => navigate({ name: 'terms' })}>
            <span className="settings-row__label">Terms</span>
            <span aria-hidden="true">›</span>
          </button>
        </div>

        <div className="settings-section">
          <p className="settings-section__title">Business</p>
          <button className="settings-row" onClick={() => navigate({ name: 'business' })}>
            <span>
              <span className="settings-row__label">Submit a game / advertise</span>
              <div className="settings-row__hint">Get your game featured, or ask about promo placements</div>
            </span>
            <span aria-hidden="true">›</span>
          </button>
        </div>

        {env.debugScreenEnabled && (
          <div className="settings-section">
            <p className="settings-section__title">Internal / test build</p>
            <button className="settings-row" onClick={() => navigate({ name: 'debug' })}>
              <span>
                <span className="settings-row__label">Debug log</span>
                <div className="settings-row__hint">Mode: {env.mode} · never shown in production builds</div>
              </span>
              <span aria-hidden="true">›</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
