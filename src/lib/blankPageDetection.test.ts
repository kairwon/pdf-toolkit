import { describe, expect, it } from 'vitest'
import { analyzePagePixels, suggestedBlankPages } from './blankPageDetection'

function pagePixels(width: number, height: number, value = 255) {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels[offset] = value; pixels[offset + 1] = value; pixels[offset + 2] = value; pixels[offset + 3] = 255
  }
  return pixels
}

describe('blank page detection', () => {
  it('treats a uniformly grey scanned sheet as blank', () => {
    const pixels = pagePixels(100, 100, 238)
    expect(analyzePagePixels(pixels, 100, 100)).toMatchObject({ inkPercent: 0, backgroundLuminance: 238 })
  })

  it('never mistakes a dark full-page scan for an empty sheet', () => {
    const pixels = pagePixels(100, 100, 80)
    expect(analyzePagePixels(pixels, 100, 100).inkPercent).toBeGreaterThan(95)
  })

  it('detects grouped text-like marks but ignores isolated dust', () => {
    const pixels = pagePixels(100, 100)
    for (let y = 35; y < 45; y++) for (let x = 20; x < 80; x++) {
      const offset = (y * 100 + x) * 4
      pixels[offset] = 20; pixels[offset + 1] = 20; pixels[offset + 2] = 20
    }
    for (const [x, y] of [[12, 12], [50, 15], [84, 72]]) {
      const offset = (y * 100 + x) * 4
      pixels[offset] = 0; pixels[offset + 1] = 0; pixels[offset + 2] = 0
    }
    expect(analyzePagePixels(pixels, 100, 100).inkPercent).toBeGreaterThan(5)
  })

  it('returns page numbers below the selected sensitivity threshold', () => {
    expect(suggestedBlankPages([{ pageNumber: 1, inkPercent: .2 }, { pageNumber: 2, inkPercent: .01 }], .08)).toEqual([2])
  })
})
