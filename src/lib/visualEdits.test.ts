import { describe, expect, it } from 'vitest'
import { alignVisualEdit, clampNormalizedBox, duplicateVisualEditToPages, hexToRgb, moveVisualEditLayer, normalizeVisualRotation, pagesRequiringSecureFlattening, requiresRasterText, rotatedBoxOrigin, snapVisualEdit, type VisualEdit } from './visualEdits'

describe('visual edit geometry', () => {
  it('normalizes rotation and keeps the rotated PDF object centred', () => {
    expect(normalizeVisualRotation(270)).toBe(-90)
    expect(normalizeVisualRotation(-540)).toBe(-180)
    expect(normalizeVisualRotation(Number.NaN)).toBe(0)
    const origin = rotatedBoxOrigin(10, 20, 40, 20, 90)
    expect(origin.x).toBeCloseTo(40)
    expect(origin.y).toBeCloseTo(10)
  })

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
      { id: 'hidden-redaction', pageIndex: 4, type: 'rectangle', x: 0, y: 0, width: 0.2, height: 0.1, color: '#000000', opacity: 1, redaction: true, hidden: true },
    ]
    expect([...pagesRequiringSecureFlattening(edits)]).toEqual([2])
  })

  it('snaps and aligns draggable objects', () => {
    const edit: VisualEdit = { id: 'text', pageIndex: 0, type: 'text', x: .133, y: .247, width: .31, height: .08, text: 'A', color: '#000000', fontSize: 12 }
    expect(snapVisualEdit(edit, .05)).toMatchObject({ x: .15, y: .25, width: .3, height: .1 })
    expect(alignVisualEdit(edit, 'center').x).toBeCloseTo(.345)
    expect(alignVisualEdit(edit, 'bottom').y).toBeCloseTo(.92)
  })

  it('duplicates an object to requested pages with fresh identities', () => {
    const edit: VisualEdit = { id: 'shape', pageIndex: 1, type: 'rectangle', x: .1, y: .1, width: .2, height: .2, color: '#000000', opacity: 1 }
    let next = 0
    const copies = duplicateVisualEditToPages(edit, [0, 1, 2], () => `copy-${++next}`)
    expect(copies.map(({ id, pageIndex }) => ({ id, pageIndex }))).toEqual([{ id: 'copy-1', pageIndex: 0 }, { id: 'copy-2', pageIndex: 2 }])
  })

  it('uses a browser-rendered fallback for multilingual added text', () => {
    expect(requiresRasterText('Private PDF 2026')).toBe(false)
    expect(requiresRasterText('私人 PDF')).toBe(true)
    expect(requiresRasterText('مرحبا')).toBe(true)
  })

  it('changes layer order only among objects on the selected page', () => {
    const edits: VisualEdit[] = [
      { id: 'a', pageIndex: 0, type: 'rectangle', x: 0, y: 0, width: .2, height: .2, color: '#000000', opacity: 1 },
      { id: 'other-page', pageIndex: 1, type: 'rectangle', x: 0, y: 0, width: .2, height: .2, color: '#000000', opacity: 1 },
      { id: 'b', pageIndex: 0, type: 'rectangle', x: 0, y: 0, width: .2, height: .2, color: '#000000', opacity: 1 },
      { id: 'c', pageIndex: 0, type: 'rectangle', x: 0, y: 0, width: .2, height: .2, color: '#000000', opacity: 1 },
    ]
    expect(moveVisualEditLayer(edits, 'a', 'front').map((edit) => edit.id)).toEqual(['b', 'other-page', 'c', 'a'])
    expect(moveVisualEditLayer(edits, 'c', 'backward').map((edit) => edit.id)).toEqual(['a', 'other-page', 'c', 'b'])
  })
})
