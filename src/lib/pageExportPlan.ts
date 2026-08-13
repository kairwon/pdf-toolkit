import type { ArrangePdfPage } from './pdf'

export interface VisiblePdfPage {
  index: number
  rotation?: number
}

/** Build a PDF export plan in the exact order currently visible in the UI. */
export function buildVisiblePagePlan(
  pages: VisiblePdfPage[],
  selected: Set<number>,
  includeSelected: boolean,
): ArrangePdfPage[] {
  return pages
    .filter((page) => selected.has(page.index) === includeSelected)
    .map((page) => ({
      pageIndex: page.index,
      rotation: page.rotation ?? 0,
    }))
}
