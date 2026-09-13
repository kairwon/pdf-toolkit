import { describe, expect, it } from 'vitest'
import { findDuplicatePageGroups, fingerprintPagePixels, fingerprintSimilarity } from './duplicatePageDetection'

function pagePixels(width: number, height: number, value = 255) {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels[offset] = value; pixels[offset + 1] = value; pixels[offset + 2] = value; pixels[offset + 3] = 255
  }
  return pixels
}

function addMark(pixels: Uint8ClampedArray, width: number, x0: number, y0: number) {
  for (let y = y0; y < y0 + 12; y++) for (let x = x0; x < x0 + 28; x++) {
    const offset = (y * width + x) * 4
    pixels[offset] = 20; pixels[offset + 1] = 20; pixels[offset + 2] = 20
  }
}

describe('duplicate page detection', () => {
  it('creates identical fingerprints for identical rendered pages', () => {
    const pixels = pagePixels(90, 90); addMark(pixels, 90, 12, 25)
    expect(fingerprintSimilarity(fingerprintPagePixels(pixels, 90, 90), fingerprintPagePixels(pixels.slice(), 90, 90))).toBe(100)
  })

  it('does not match pages with different layouts', () => {
    const first = pagePixels(90, 90); const second = pagePixels(90, 90)
    addMark(first, 90, 8, 12); addMark(second, 90, 52, 62)
    expect(fingerprintSimilarity(fingerprintPagePixels(first, 90, 90), fingerprintPagePixels(second, 90, 90))).toBeLessThan(95)
  })

  it('groups duplicate pages without repeating a page across groups', () => {
    const a = { bits: '1010', meanLuminance: 240 }
    const b = { bits: '1011', meanLuminance: 241 }
    const c = { bits: '0000', meanLuminance: 240 }
    expect(findDuplicatePageGroups([{ pageNumber: 1, fingerprint: a }, { pageNumber: 2, fingerprint: b }, { pageNumber: 3, fingerprint: c }], 75)).toEqual([{ pageNumbers: [1, 2], similarity: 75 }])
  })
})
