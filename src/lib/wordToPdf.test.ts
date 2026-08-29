import { describe, expect, it } from 'vitest'
import { pdfPageSizeForElement } from './wordToPdf'

describe('pdfPageSizeForElement', () => {
  it('converts CSS pixels to PDF points without changing proportions', () => {
    expect(pdfPageSizeForElement(816, 1056)).toEqual({ width: 612, height: 792 })
  })

  it('never returns a zero-sized PDF page', () => {
    expect(pdfPageSizeForElement(0, 0)).toEqual({ width: 1, height: 1 })
  })
})
