import { useState } from 'react'
import { useRouter } from '../router/router'
import { getEventLog, clearEventLog } from '../services/events/eventLogger'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { env } from '../config/env'

const SUSPICIOUS_EVENT_NAMES = new Set(['suspicious_click_pattern', 'suspicious_repeat_pattern', 'blocked_click'])

/**
 * Internal/dev builds only — env.debugScreenEnabled is false whenever
 * env.mode === 'production', and App.tsx's router already refuses to route
 * here in that case. This component re-checks the same flag as a second,
 * defense-in-depth guard (spec: "Never ship debug screen enabled in
 * production builds").
 */
export function DebugScreen() {
  const { back } = useRouter()
  const [, forceRerender] = useState(0)

  if (!env.debugScreenEnabled) {
    return (
      <div className="screen">
        <EmptyState glyph="🔒" title="Not available" body="Debug screen is disabled in this build." />
      </div>
    )
  }

  const events = [...getEventLog()].reverse()
  const suspiciousCount = events.filter((e) => SUSPICIOUS_EVENT_NAMES.has(e.name)).length

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="icon-button tap-target" onClick={back} aria-label="Back">
          ←
        </button>
        <h1 className="screen-header__title" style={{ flex: 1 }}>
          Debug
        </h1>
        <Button
          variant="ghost"
          onClick={() => {
            clearEventLog()
            forceRerender((n) => n + 1)
          }}
        >
          Clear
        </Button>
      </div>
      <div className="screen__scroll">
        <p className="settings-section__title">
          Mode: {env.mode} · {events.length} events{suspiciousCount ? ` · ${suspiciousCount} flagged` : ''}
        </p>
        {events.length === 0 ? (
          <EmptyState glyph="🗒️" title="No events yet" body="Interact with the feed or a playable preview to see logs here." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="debug-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Creative</th>
                  <th>Payload</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.ts).toLocaleTimeString()}</td>
                    <td>
                      {e.name === 'blocked_click' ? (
                        <span className="pill pill--danger">{e.name}</span>
                      ) : SUSPICIOUS_EVENT_NAMES.has(e.name) ? (
                        <span className="pill pill--warning">{e.name}</span>
                      ) : (
                        <span className="pill pill--neutral">{e.name}</span>
                      )}
                    </td>
                    <td>{e.creativeId ?? ''}</td>
                    <td className="wrap">{e.payload ? JSON.stringify(e.payload) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
