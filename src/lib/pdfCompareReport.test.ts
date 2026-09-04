import { describe, expect, it } from 'vitest'
import { createPdfComparisonCsv, summarizePdfComparison } from './pdfCompareReport'

describe('PDF comparison report', () => {
  it('summarizes scanned, changed, unscanned, and unmatched pages', () => {
    expect(summarizePdfComparison([0, 0.02, null], 4, 3)).toEqual({
      comparedPages: 2,
      changedPages: [2],
      unchangedPages: 1,
      unscannedPages: 1,
      onlyInFirst: 1,
      onlyInSecond: 0,
      largestDifference: 0.02,
    })
  })

  it('creates a spreadsheet-safe report for every page position', () => {
    const csv = createPdfComparisonCsv('draft, one.pdf', '=IMPORTXML("bad")', 2, 3, [0, 1.23456])
    expect(csv).toContain('First file,"draft, one.pdf"')
    expect(csv).toContain('Second file,"\'=IMPORTXML(""bad"")"')
    expect(csv).toContain('1,No material difference,0.0000')
    expect(csv).toContain('2,Changed,1.2346')
    expect(csv).toContain('3,Only in second file,')
  })
})
