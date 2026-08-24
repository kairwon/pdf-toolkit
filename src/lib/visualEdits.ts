import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export type NormalizedPoint = { x: number; y: number }

type VisualEditBase = {
  id: string
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
}

export type VisualEdit =
  | (VisualEditBase & { type: 'text'; text: string; color: string; fontSize: number; italic?: boolean })
  | (VisualEditBase & { type: 'image'; dataUrl: string; alt: string })
  | (VisualEditBase & { type: 'rectangle'; color: string; opacity: number; redaction?: boolean })
  | (VisualEditBase & { type: 'ink'; color: string; strokeWidth: number; points: NormalizedPoint[] })

export type PageNumberOptions = {
  enabled: boolean
  startPage: number
  startNumber: number
  position: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-center' | 'top-right'
  prefix: string
  suffix: string
  color: string
  fontSize: number
}

export const DEFAULT_PAGE_NUMBERS: PageNumberOptions = {
  enabled: false,
  startPage: 1,
  startNumber: 1,
  position: 'bottom-center',
  prefix: '',
  suffix: '',
  color: '#33463d',
  fontSize: 11,
}

export function clampNormalizedBox<T extends Pick<VisualEditBase, 'x' | 'y' | 'width' | 'height'>>(box: T): T {
  const width = Math.min(1, Math.max(0.025, box.width))
  const height = Math.min(1, Math.max(0.025, box.height))
  return {
    ...box,
    width,
    height,
    x: Math.min(1 - width, Math.max(0, box.x)),
    y: Math.min(1 - height, Math.max(0, box.y)),
  }
}

export function hexToRgb(hex: string) {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : '000000'
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255,
  }
}

export function pagesRequiringSecureFlattening(edits: VisualEdit[]) {
  return new Set(edits.filter((edit) => edit.type === 'rectangle' && edit.redaction).map((edit) => edit.pageIndex))
}

async function dataUrlBytes(dataUrl: string) {
  return new Uint8Array(await (await fetch(dataUrl)).arrayBuffer())
}

function pageNumberCoordinates(
  position: PageNumberOptions['position'],
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  fontSize: number,
) {
  const margin = Math.max(18, fontSize * 1.5)
  const x = position.endsWith('left') ? margin : position.endsWith('right') ? pageWidth - textWidth - margin : (pageWidth - textWidth) / 2
  const y = position.startsWith('top') ? pageHeight - fontSize - margin : margin
  return { x, y }
}

/**
 * Apply normalized visual objects to a PDF. Pages containing a redaction are
 * rasterized before the black boxes are drawn so covered text, images and
 * annotations are not recoverable from the output page content.
 */
export async function applyVisualEdits(
  file: File,
  edits: VisualEdit[],
  pageNumbers: PageNumberOptions = DEFAULT_PAGE_NUMBERS,
  onProgress?: (current: number, total: number, message: string) => void,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const source = await PDFDocument.load(await file.arrayBuffer())
  const output = await PDFDocument.create()
  const securePages = pagesRequiringSecureFlattening(edits)
  const font = await output.embedFont(StandardFonts.Helvetica)
  const italicFont = await output.embedFont(StandardFonts.TimesRomanItalic)
  const imageCache = new Map<string, Awaited<ReturnType<typeof output.embedPng>>>()

  for (let pageIndex = 0; pageIndex < source.getPageCount(); pageIndex++) {
    if (signal?.aborted) throw new DOMException('Operation cancelled', 'AbortError')
    const sourcePage = source.getPage(pageIndex)
    const { width, height } = sourcePage.getSize()
    let page

    if (securePages.has(pageIndex)) {
      onProgress?.(pageIndex + 1, source.getPageCount(), `Flattening page ${pageIndex + 1} for secure redaction…`)
      const { renderPageToCanvas } = await import('./pdf')
      const preview = await renderPageToCanvas(file, pageIndex + 1, 2, 'png')
      const background = await output.embedPng(await dataUrlBytes(preview))
      page = output.addPage([width, height])
      page.drawImage(background, { x: 0, y: 0, width, height })
    } else {
      const [copied] = await output.copyPages(source, [pageIndex])
      page = output.addPage(copied)
    }

    for (const edit of edits.filter((item) => item.pageIndex === pageIndex)) {
      const x = edit.x * width
      const y = height - (edit.y + edit.height) * height
      const editWidth = edit.width * width
      const editHeight = edit.height * height

      if (edit.type === 'rectangle') {
        const color = hexToRgb(edit.redaction ? '#000000' : edit.color)
        page.drawRectangle({ x, y, width: editWidth, height: editHeight, color: rgb(color.r, color.g, color.b), opacity: edit.redaction ? 1 : edit.opacity })
      } else if (edit.type === 'text') {
        const color = hexToRgb(edit.color)
        const size = Math.max(6, Math.min(72, edit.fontSize))
        page.drawText(edit.text || 'Text', {
          x,
          y: Math.max(0, height - edit.y * height - size),
          size,
          maxWidth: Math.max(8, editWidth),
          lineHeight: size * 1.2,
          font: edit.italic ? italicFont : font,
          color: rgb(color.r, color.g, color.b),
        })
      } else if (edit.type === 'image') {
        let embedded = imageCache.get(edit.dataUrl)
        if (!embedded) {
          const bytes = await dataUrlBytes(edit.dataUrl)
          embedded = edit.dataUrl.startsWith('data:image/jpeg') ? await output.embedJpg(bytes) : await output.embedPng(bytes)
          imageCache.set(edit.dataUrl, embedded)
        }
        page.drawImage(embedded, { x, y, width: editWidth, height: editHeight })
      } else if (edit.type === 'ink' && edit.points.length > 1) {
        const color = hexToRgb(edit.color)
        for (let pointIndex = 1; pointIndex < edit.points.length; pointIndex++) {
          const start = edit.points[pointIndex - 1]
          const end = edit.points[pointIndex]
          page.drawLine({
            start: { x: start.x * width, y: height - start.y * height },
            end: { x: end.x * width, y: height - end.y * height },
            thickness: Math.max(0.6, edit.strokeWidth),
            color: rgb(color.r, color.g, color.b),
          })
        }
      }
    }

    if (pageNumbers.enabled && pageIndex + 1 >= pageNumbers.startPage) {
      const value = `${pageNumbers.prefix}${pageNumbers.startNumber + pageIndex + 1 - pageNumbers.startPage}${pageNumbers.suffix}`
      const textWidth = font.widthOfTextAtSize(value, pageNumbers.fontSize)
      const coordinates = pageNumberCoordinates(pageNumbers.position, width, height, textWidth, pageNumbers.fontSize)
      const color = hexToRgb(pageNumbers.color)
      page.drawText(value, { ...coordinates, size: pageNumbers.fontSize, font, color: rgb(color.r, color.g, color.b) })
    }
    onProgress?.(pageIndex + 1, source.getPageCount(), `Prepared page ${pageIndex + 1} of ${source.getPageCount()}`)
  }

  if (signal?.aborted) throw new DOMException('Operation cancelled', 'AbortError')
  return output.save()
}
