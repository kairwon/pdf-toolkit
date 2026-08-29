export type WordRenderProgress = (current: number, total: number, message: string) => void

const renderOptions = {
  inWrapper: true,
  breakPages: true,
  ignoreWidth: false,
  ignoreHeight: false,
  renderHeaders: true,
  renderFooters: true,
  renderFootnotes: true,
  renderEndnotes: true,
  useBase64URL: true,
} as const

export async function renderWordDocument(file: File, container: HTMLElement) {
  container.replaceChildren()
  const { renderAsync } = await import('docx-preview')
  await renderAsync(file, container, container, renderOptions)
  await document.fonts?.ready
  await Promise.all(Array.from(container.querySelectorAll('img')).map((image) => image.decode().catch(() => undefined)))
  return getWordPages(container).length
}

export function getWordPages(container: HTMLElement) {
  const sections = Array.from(container.querySelectorAll<HTMLElement>('section.docx'))
  if (sections.length > 0) return sections
  return Array.from(container.querySelectorAll<HTMLElement>('.docx-wrapper > section'))
}

export function pdfPageSizeForElement(widthPx: number, heightPx: number) {
  const pointsPerCssPixel = 72 / 96
  return {
    width: Math.max(1, widthPx * pointsPerCssPixel),
    height: Math.max(1, heightPx * pointsPerCssPixel),
  }
}

export async function renderedWordToPdf(
  container: HTMLElement,
  progress?: WordRenderProgress,
  signal?: AbortSignal,
) {
  const pages = getWordPages(container)
  if (pages.length === 0) throw new Error('No Word pages are ready to convert')

  const [{ default: html2canvas }, { PDFDocument }] = await Promise.all([
    import('html2canvas'),
    import('pdf-lib'),
  ])
  const pdf = await PDFDocument.create()
  const previousZoom = container.style.zoom
  container.style.zoom = '1'

  try {
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    for (const [index, pageElement] of pages.entries()) {
      if (signal?.aborted) throw new DOMException('Conversion cancelled', 'AbortError')
      progress?.(index + 1, pages.length, `Rendering page ${index + 1} of ${pages.length}`)
      const canvas = await html2canvas(pageElement, {
        backgroundColor: '#ffffff',
        scale: Math.min(2, Math.max(1.35, window.devicePixelRatio || 1)),
        logging: false,
        useCORS: false,
      })
      const jpg = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not render this page')), 'image/jpeg', 0.92))
      const image = await pdf.embedJpg(await jpg.arrayBuffer())
      const size = pdfPageSizeForElement(pageElement.offsetWidth || canvas.width, pageElement.offsetHeight || canvas.height)
      const page = pdf.addPage([size.width, size.height])
      page.drawImage(image, { x: 0, y: 0, width: size.width, height: size.height })
      canvas.width = 1
      canvas.height = 1
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
    progress?.(pages.length, pages.length, 'Finishing the PDF')
    return await pdf.save({ useObjectStreams: true })
  } finally {
    container.style.zoom = previousZoom
  }
}
