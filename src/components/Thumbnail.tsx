import { useState } from 'react'
import type { CreativePublic } from '../types/creative'

/** Renders a card's art. Falls back to the gradient+glyph if an `image` thumbnail 404s or fails to decode — a broken remote creative must never break the feed. */
export function Thumbnail({ thumbnail, title }: { thumbnail: CreativePublic['thumbnail']; title: string }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = thumbnail.kind === 'image' && !imageFailed

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 'inherit',
        overflow: 'hidden',
        background: `linear-gradient(155deg, ${thumbnail.from}, ${thumbnail.to})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {showImage && thumbnail.kind === 'image' && (
        <img
          src={thumbnail.url}
          alt=""
          onError={() => setImageFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      {!showImage && (
        <span aria-hidden="true" style={{ fontSize: 64, filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.25))' }}>
          {thumbnail.glyph}
        </span>
      )}
      <span className="visually-hidden">{title} thumbnail</span>
    </div>
  )
}
