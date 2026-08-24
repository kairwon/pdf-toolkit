import { describe, expect, it } from 'vitest'
import { clampWatermarkAnchor, resolveWatermarkCoordinates } from './watermarkPlacement'

describe('visual watermark placement', () => {
  it('maps a top-left visual anchor to PDF coordinates', () => {
    expect(resolveWatermarkCoordinates(600, 800, 100, 40, { x: 0.25, y: 0.75 })).toEqual({ x: 100, y: 180 })
  })

  it('keeps the watermark box inside the page', () => {
    expect(resolveWatermarkCoordinates(600, 800, 100, 40, { x: -1, y: -1 })).toEqual({ x: 0, y: 760 })
    expect(resolveWatermarkCoordinates(600, 800, 100, 40, { x: 2, y: 2 })).toEqual({ x: 500, y: 0 })
    expect(clampWatermarkAnchor({ x: 1.4, y: -0.2 })).toEqual({ x: 1, y: 0 })
  })

  it('keeps the visual center fixed while rotating around the PDF draw origin', () => {
    const coordinates = resolveWatermarkCoordinates(600, 800, 100, 40, { x: 0.5, y: 0.5 }, 90)
    expect(coordinates.x).toBeCloseTo(320)
    expect(coordinates.y).toBeCloseTo(350)
  })
})
