/**
 * Shared drawing/PNG-encoding primitives for generate-icons.mjs and
 * generate-feature-graphic.mjs — pure Node, zero dependencies (a tiny
 * scanline polygon fill + hand-rolled PNG encoder), since no image
 * rasterization tool is available in this dev environment. Everything
 * renders supersampled and is box-filtered down for antialiasing.
 */
import { deflateSync } from 'node:zlib'

export const SS = 4

export function newCanvas(w, h) {
  return { w, h, data: new Uint8ClampedArray(w * h * 4) }
}

export function setPx(c, x, y, [r, g, b, a]) {
  x = Math.round(x); y = Math.round(y)
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return
  const i = (y * c.w + x) * 4
  if (a >= 255) {
    c.data[i] = r; c.data[i + 1] = g; c.data[i + 2] = b; c.data[i + 3] = 255
  } else {
    const srcA = a / 255
    const dstA = c.data[i + 3] / 255
    const outA = srcA + dstA * (1 - srcA)
    if (outA <= 0) return
    c.data[i] = (r * srcA + c.data[i] * dstA * (1 - srcA)) / outA
    c.data[i + 1] = (g * srcA + c.data[i + 1] * dstA * (1 - srcA)) / outA
    c.data[i + 2] = (b * srcA + c.data[i + 2] * dstA * (1 - srcA)) / outA
    c.data[i + 3] = outA * 255
  }
}

export function fillRect(c, x0, y0, x1, y1, color) {
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(c.h - 1, Math.ceil(y1)); y++) {
    for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(c.w - 1, Math.ceil(x1)); x++) setPx(c, x, y, color)
  }
}

export function fillPolygon(c, points, color) {
  const ys = points.map((p) => p[1])
  const minY = Math.max(0, Math.floor(Math.min(...ys)))
  const maxY = Math.min(c.h - 1, Math.ceil(Math.max(...ys)))
  for (let y = minY; y <= maxY; y++) {
    const yc = y + 0.5
    const xs = []
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i]
      const [x2, y2] = points[(i + 1) % points.length]
      if ((y1 <= yc && y2 > yc) || (y2 <= yc && y1 > yc)) {
        xs.push(x1 + ((yc - y1) / (y2 - y1)) * (x2 - x1))
      }
    }
    xs.sort((a, b) => a - b)
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const xStart = Math.max(0, Math.round(xs[i]))
      const xEnd = Math.min(c.w - 1, Math.round(xs[i + 1]))
      for (let x = xStart; x <= xEnd; x++) setPx(c, x, y, color)
    }
  }
}

/** Analytic rounded-rect fill (correct rounded corners, unlike a polygon approximation). */
export function fillRoundedRect(c, x0, y0, x1, y1, radius, color) {
  const minX = Math.max(0, Math.floor(x0)), maxX = Math.min(c.w - 1, Math.ceil(x1))
  const minY = Math.max(0, Math.floor(y0)), maxY = Math.min(c.h - 1, Math.ceil(y1))
  const r = Math.min(radius, (x1 - x0) / 2, (y1 - y0) / 2)
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5
      const inXBand = px >= x0 + r && px <= x1 - r
      const inYBand = py >= y0 + r && py <= y1 - r
      if (inXBand || inYBand) {
        setPx(c, x, y, color)
        continue
      }
      const cx = px < x0 + r ? x0 + r : x1 - r
      const cy = py < y0 + r ? y0 + r : y1 - r
      if ((px - cx) ** 2 + (py - cy) ** 2 <= r * r) setPx(c, x, y, color)
    }
  }
}

/**
 * Rounded rect with a colored border ring (used for the gold/emerald
 * "featured card" accent border) — paints the border color full-size,
 * then paints `fillColor` inset by `width` on top. A transparent "cutout"
 * doesn't work here: setPx's alpha blending treats alpha=0 as a no-op,
 * not an eraser, so the inset pass has to repaint with an actual color.
 */
export function strokeRoundedRect(c, x0, y0, x1, y1, radius, width, borderColor, fillColor) {
  fillRoundedRect(c, x0, y0, x1, y1, radius, borderColor)
  fillRoundedRect(c, x0 + width, y0 + width, x1 - width, y1 - width, Math.max(0, radius - width), fillColor)
}

/** Soft radial glow — additive-ish falloff from full color at center to transparent at r. */
export function fillRadialGlow(c, cx, cy, r, [cr, cg, cb], maxAlpha = 140) {
  const minX = Math.max(0, Math.floor(cx - r)), maxX = Math.min(c.w - 1, Math.ceil(cx + r))
  const minY = Math.max(0, Math.floor(cy - r)), maxY = Math.min(c.h - 1, Math.ceil(cy + r))
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d = Math.hypot(x - cx, y - cy) / r
      if (d > 1) continue
      const a = maxAlpha * (1 - d) ** 2
      setPx(c, x, y, [cr, cg, cb, a])
    }
  }
}

export function fillCircleMask(c, cx, cy, r) {
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) {
        c.data[(y * c.w + x) * 4 + 3] = 0
      }
    }
  }
}

export function downsample(c, factor) {
  const w = c.w / factor, h = c.h / factor
  const out = newCanvas(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0
      const n = factor * factor
      for (let sy = 0; sy < factor; sy++) {
        for (let sx = 0; sx < factor; sx++) {
          const i = ((y * factor + sy) * c.w + (x * factor + sx)) * 4
          r += c.data[i]; g += c.data[i + 1]; b += c.data[i + 2]; a += c.data[i + 3]
        }
      }
      const o = (y * w + x) * 4
      out.data[o] = r / n; out.data[o + 1] = g / n; out.data[o + 2] = b / n; out.data[o + 3] = a / n
    }
  }
  return out
}

// --- Gem mark: exactly public/favicon.svg (viewBox 0 0 48 48, outline
// points 24,8 / 36,20 / 30,40 / 18,40 / 12,20, converging at 24,24) ---
export const GEM_PALETTE = {
  base: [0xc9, 0x97, 0x1f, 255],
  topRight: [0xf5, 0xd5, 0x76, 255],
  topLeft: [0xdc, 0xae, 0x5c, 255],
  left: [0x93, 0x71, 0x1f, 255],
  right: [0x7a, 0x5a, 0x10, 255],
}

/** `s` is the gem's half-height (the 16-unit top offset in the 48x48 original). */
export function drawGem(c, cx, cy, s) {
  const top = [cx, cy - s]
  const right = [cx + s * 0.75, cy - s * 0.25]
  const bottomRight = [cx + s * 0.375, cy + s]
  const bottomLeft = [cx - s * 0.375, cy + s]
  const left = [cx - s * 0.75, cy - s * 0.25]
  const center = [cx, cy]

  fillPolygon(c, [top, right, bottomRight, bottomLeft, left], GEM_PALETTE.base)
  fillPolygon(c, [top, right, center], GEM_PALETTE.topRight)
  fillPolygon(c, [top, left, center], GEM_PALETTE.topLeft)
  fillPolygon(c, [left, bottomLeft, center], GEM_PALETTE.left)
  fillPolygon(c, [right, bottomRight, center], GEM_PALETTE.right)
}

// --- Minimal PNG encoder (raw RGBA -> zlib -> PNG chunks) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}
export function encodePNG(canvas) {
  const { w, h, data } = canvas
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0 // no per-scanline filter
    for (let x = 0; x < w * 4; x++) raw[y * (w * 4 + 1) + 1 + x] = data[y * w * 4 + x]
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
