export const MATERIAL_DIFFERENCE_PERCENT = 0.01

export type PdfComparisonSummary = {
  comparedPages: number
  changedPages: number[]
  unchangedPages: number
  unscannedPages: number
  onlyInFirst: number
  onlyInSecond: number
  largestDifference: number
}

export function summarizePdfComparison(scores: Array<number | null>, firstPageCount: number, secondPageCount: number): PdfComparisonSummary {
  const completed = scores.flatMap((score, index) => typeof score === 'number' ? [{ score, page: index + 1 }] : [])
  const changedPages = completed.filter(({ score }) => score >= MATERIAL_DIFFERENCE_PERCENT).map(({ page }) => page)
  return {
    comparedPages: completed.length,
    changedPages,
    unchangedPages: completed.length - changedPages.length,
    unscannedPages: Math.max(0, Math.min(firstPageCount, secondPageCount) - completed.length),
    onlyInFirst: Math.max(0, firstPageCount - secondPageCount),
    onlyInSecond: Math.max(0, secondPageCount - firstPageCount),
    largestDifference: completed.reduce((largest, { score }) => Math.max(largest, score), 0),
  }
}

function csvCell(value: string | number) {
  const raw = String(value)
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function createPdfComparisonCsv(firstName: string, secondName: string, firstPageCount: number, secondPageCount: number, scores: Array<number | null>) {
  const rows: Array<Array<string | number>> = [
    ['First file', firstName],
    ['Second file', secondName],
    [],
    ['Page', 'Status', 'Changed pixels (%)'],
  ]
  for (let page = 1; page <= Math.max(firstPageCount, secondPageCount); page++) {
    if (page > firstPageCount) rows.push([page, 'Only in second file', ''])
    else if (page > secondPageCount) rows.push([page, 'Only in first file', ''])
    else if (typeof scores[page - 1] !== 'number') rows.push([page, 'Not scanned', ''])
    else {
      const score = scores[page - 1] as number
      rows.push([page, score >= MATERIAL_DIFFERENCE_PERCENT ? 'Changed' : 'No material difference', score.toFixed(4)])
    }
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`
}
