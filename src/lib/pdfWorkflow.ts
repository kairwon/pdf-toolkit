import { addWatermark, compressPdf, getPageCount, rotatePages } from './pdfLazy'
import { applyVisualEdits, DEFAULT_PAGE_NUMBERS } from './visualEdits'

export interface PdfWorkflowConfig {
  rotate: 0 | 90 | 180 | 270
  pageNumbers: boolean
  watermark: string
  compress: 'none' | 'lossless' | 'balanced' | 'aggressive'
}

export const WORKFLOW_PRESETS: Record<string, { name: string; description: string; config: PdfWorkflowConfig }> = {
  submission: { name: 'University submission', description: 'Add centered page numbers and optimize without rasterizing searchable text.', config: { rotate: 0, pageNumbers: true, watermark: '', compress: 'lossless' } },
  visa: { name: 'Visa document copy', description: 'Add a COPY watermark and use balanced scan compression.', config: { rotate: 0, pageNumbers: false, watermark: 'COPY', compress: 'balanced' } },
  archive: { name: 'Private archive copy', description: 'Add page numbers and preserve searchable text with lossless optimization.', config: { rotate: 0, pageNumbers: true, watermark: 'ARCHIVE COPY', compress: 'lossless' } },
}

const nextFile = (bytes: Uint8Array, name: string) => new File([Uint8Array.from(bytes).buffer], name, { type: 'application/pdf' })

export async function runPdfWorkflow(file: File, config: PdfWorkflowConfig, onProgress?: (message: string) => void, signal?: AbortSignal) {
  let current = file
  const check = () => { if (signal?.aborted) throw new DOMException('Operation cancelled', 'AbortError') }
  if (config.rotate) {
    check(); onProgress?.('Rotating every page…')
    const count = await getPageCount(current)
    current = nextFile(await rotatePages(current, Array.from({ length: count }, (_, index) => index), config.rotate as 90 | 180 | 270), file.name)
  }
  if (config.pageNumbers) {
    check(); onProgress?.('Adding page numbers…')
    current = nextFile(await applyVisualEdits(current, [], { ...DEFAULT_PAGE_NUMBERS, enabled: true }, undefined, signal), file.name)
  }
  if (config.watermark.trim()) {
    check(); onProgress?.('Adding watermark…')
    current = nextFile(await addWatermark(current, config.watermark.trim(), { opacity: .16, angle: -35, position: 'tile', widthRatio: .3 }), file.name)
  }
  if (config.compress !== 'none') {
    check(); onProgress?.('Optimizing file size…')
    current = nextFile(await compressPdf(current, config.compress), file.name)
  }
  check()
  return new Uint8Array(await current.arrayBuffer())
}
