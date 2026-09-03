#!/usr/bin/env node
/**
 * Generates the actual launcher icon PNGs from the SAME gem mark already
 * used as the app's own favicon (public/favicon.svg) — not a new design,
 * a faithful re-render of that exact one at launcher-icon sizes. Drawing
 * primitives live in icon-lib.mjs (shared with generate-feature-graphic.mjs).
 *
 * If you ever change public/favicon.svg's gem shape/colors, mirror the
 * same change in icon-lib.mjs's drawGem() and re-run this.
 *
 * Run again any time the design changes:
 *   node generate-icons.mjs
 *
 * Writes, per density under app/src/main/res/mipmap-<density>/:
 *   ic_launcher.png            flat icon, square
 *   ic_launcher_round.png      flat icon, circle-clipped
 *   ic_launcher_foreground.png gem only, transparent bg, adaptive-icon safe zone
 * Plus play-store-icon-512.png (Play Console's separate store-listing icon upload).
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { SS, newCanvas, drawGem, fillCircleMask, downsample, encodePNG } from './icon-lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RES = join(__dirname, 'app/src/main/res')
const BG = [0x12, 0x14, 0x1a, 255] // matches ic_launcher_background.xml

function renderIconAt(size, { round = false, foregroundOnly = false } = {}) {
  const c = newCanvas(size * SS, size * SS)
  if (!foregroundOnly) {
    for (let i = 0; i < c.data.length; i += 4) {
      c.data[i] = BG[0]; c.data[i + 1] = BG[1]; c.data[i + 2] = BG[2]; c.data[i + 3] = 255
    }
  }
  // favicon.svg's gem spans 16/48 of the frame above/below center (its
  // exact proportions, reused as-is) — right for the flat/round assets,
  // which already sit inside their own frame. The adaptive foreground
  // layer needs extra margin on top of that so aggressive launcher masks
  // (circle/squircle crop the outer ~34% of the 108dp canvas) don't clip
  // the gem's points, so it gets an additional shrink — same shape and
  // colors, just smaller.
  const s = foregroundOnly ? c.h * (16 / 48) * 0.82 : c.h * (16 / 48)
  drawGem(c, c.w / 2, c.h / 2, s)
  if (round) fillCircleMask(c, c.w / 2, c.h / 2, c.w / 2)
  return downsample(c, SS)
}

const LAUNCHER_SIZES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
const FOREGROUND_SIZES = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 }

for (const [bucket, size] of Object.entries(LAUNCHER_SIZES)) {
  const dir = join(RES, `mipmap-${bucket}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'ic_launcher.png'), encodePNG(renderIconAt(size)))
  writeFileSync(join(dir, 'ic_launcher_round.png'), encodePNG(renderIconAt(size, { round: true })))
}
for (const [bucket, size] of Object.entries(FOREGROUND_SIZES)) {
  const dir = join(RES, `mipmap-${bucket}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'ic_launcher_foreground.png'), encodePNG(renderIconAt(size, { foregroundOnly: true })))
}

// Play Console's separate store-listing icon upload (512x512, no transparency needed).
writeFileSync(join(__dirname, 'play-store-icon-512.png'), encodePNG(renderIconAt(512)))

console.log('Wrote launcher/foreground PNGs for all 5 densities + play-store-icon-512.png')
