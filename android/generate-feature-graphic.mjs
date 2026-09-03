#!/usr/bin/env node
/**
 * Generates Play Console's required "Feature graphic" (1024x500 PNG) —
 * same pure-Node zero-dependency approach as generate-icons.mjs, sharing
 * its drawing primitives from icon-lib.mjs. Composition: the swipe-card
 * feed (a gold-bordered "featured" card peeking in front of an
 * emerald-bordered one — the app's own promo plating, see FeedCard.tsx)
 * on the left, the app's gem mark (exactly favicon.svg's) large on the
 * right with a soft glow. No text/wordmark — hand-rendering real
 * typography here isn't reliable without a font-rasterization library,
 * and the app name already sits right next to this graphic in the store
 * listing UI, so the graphic's job is just to be recognizable at a glance.
 *
 * Run again any time the design changes:
 *   node generate-feature-graphic.mjs
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { SS, newCanvas, drawGem, strokeRoundedRect, fillRadialGlow, downsample, encodePNG } from './icon-lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const W = 1024, H = 500
const BG_TOP = [0x14, 0x16, 0x1c]
const BG_BOTTOM = [0x0b, 0x0c, 0x10]
const SURFACE = [0x15, 0x17, 0x1c, 255]
const GOLD = [0xf5, 0xd5, 0x76, 255]
const GOLD_GLOW = [0xf5, 0xd5, 0x76]
const EMERALD = [0x5c, 0xff, 0x9d, 255]

const c = newCanvas(W * SS, H * SS)

// Vertical gradient background.
for (let y = 0; y < c.h; y++) {
  const t = y / c.h
  const r = BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t
  const g = BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t
  const b = BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t
  for (let x = 0; x < c.w; x++) {
    const i = (y * c.w + x) * 4
    c.data[i] = r; c.data[i + 1] = g; c.data[i + 2] = b; c.data[i + 3] = 255
  }
}

// Gem + glow, right side.
const gemCx = W * 0.72 * SS, gemCy = H * 0.5 * SS
fillRadialGlow(c, gemCx, gemCy, H * 0.46 * SS, GOLD_GLOW, 110)
drawGem(c, gemCx, gemCy, H * 0.26 * SS)

// Back card (emerald "featured" accent), peeking behind/above the front one.
const backCx = W * 0.235 * SS, backCy = H * 0.42 * SS
const backW = 155 * SS, backH = 300 * SS
strokeRoundedRect(
  c,
  backCx - backW / 2, backCy - backH / 2, backCx + backW / 2, backCy + backH / 2,
  20 * SS, 3 * SS, EMERALD, SURFACE,
)

// Front card (gold "featured" accent) — the app's own promo plating.
const frontCx = W * 0.285 * SS, frontCy = H * 0.56 * SS
const frontW = 185 * SS, frontH = 355 * SS
strokeRoundedRect(
  c,
  frontCx - frontW / 2, frontCy - frontH / 2, frontCx + frontW / 2, frontCy + frontH / 2,
  24 * SS, 4 * SS, GOLD, SURFACE,
)
// A small gem glyph on the front card, echoing "this is a featured game".
drawGem(c, frontCx, frontCy, frontH * 0.11)

const out = downsample(c, SS)
writeFileSync(join(__dirname, 'feature-graphic.png'), encodePNG(out))
console.log('Wrote feature-graphic.png (1024x500)')
