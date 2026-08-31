import type { ReactNode } from 'react'

export function EmptyState({
  glyph,
  title,
  body,
  action,
}: {
  glyph: string
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__glyph" aria-hidden="true">
        {glyph}
      </div>
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__body">{body}</p>
      {action}
    </div>
  )
}
