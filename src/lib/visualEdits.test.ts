import { describe, expect, it } from 'vitest'
import { clampNormalizedBox, hexToRgb, pagesRequiringSecureFlattening, type VisualEdit } from './visualEdits'

describe('visual edit geometry', () => {
  it('keeps resized objects inside the normalized page', () => {
    expect(clampNormalizedBox({ x: 0.95, y: -0.2, width: 0.2, height: 0.1 })).toEqual({ x: 0.8, y: 0, width: 0.2, height: 0.1 })
  })

  it('normalizes invalid sizes and colors safely', () => {
    expect(clampNormalizedBox({ x: 0.5, y: 0.5, width: 0, height: 2 })).toEqual({ x: 0.5, y: 0, width: 0.025, height: 1 })
    expect(hexToRgb('#ff8000')).toEqual({ r: 1, g: 128 / 255, b: 0 })
    expect(hexToRgb('invalid')).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('selects only pages with secure redaction objects for flattening', () => {
    const edits: VisualEdit[] = [
      { id: 'a', pageIndex: 0, type: 'rectangle', x: 0, y: 0, width: 0.2, height: 0.1, color: '#ffff00', opacity: 0.4 },
      { id: 'b', pageIndex: 2, type: 'rectangle', x: 0, y: 0, width: 0.2, height: 0.1, color: '#000000', opacity: 1, redaction: true },
      { id: 'c', pageIndex: 2, type: 'text', x: 0, y: 0, width: 0.2, height: 0.1, text: 'x', color: '#000000', fontSize: 12 },
    ]
    expect([...pagesRequiringSecureFlattening(edits)]).toEqual([2])
  })
})
