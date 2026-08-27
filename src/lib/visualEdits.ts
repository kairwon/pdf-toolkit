import { degrees, PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export type NormalizedPoint = { x: number; y: number }

type VisualEditBase = {
  id: string
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  hidden?: boolean
  locked?: boolean
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

export type VisualAlignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
export type VisualLayerMove = 'back' | 'backward' | 'forward' | 'front'

export function normalizeVisualRotation(value: number) {
  if (!Number.isFinite(value)) return 0
  const normalized = ((value + 180) % 360 + 360) % 360 - 180
  return Object.is(normalized, -0) ? 0 : normalized
}

export function rotatedBoxOrigin(x: number, y: number, width: number, height: number, rotation = 0) {
  const radians = normalizeVisualRotation(rotation) * Math.PI / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const centerX = x + width / 2
  const centerY = y + height / 2
  return {
    x: centerX - (width * cosine) / 2 + (height * sine) / 2,
    y: centerY - (width * sine) / 2 - (height * cosine) / 2,
  }
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

export function snapVisualEdit(edit: VisualEdit, step = 0.01): VisualEdit {
  if (step <= 0) return edit
  const snap = (value: number) => Number((Math.round(value / step) * step).toFixed(6))
  return clampNormalizedBox({ ...edit, x: snap(edit.x), y: snap(edit.y), width: snap(edit.width), height: snap(edit.height) }) as VisualEdit
}

export function alignVisualEdit(edit: VisualEdit, alignment: VisualAlignment): VisualEdit {
  if (edit.type === 'ink') return edit
  const position = alignment === 'left' ? { x: 0 }
    : alignment === 'center' ? { x: (1 - edit.width) / 2 }
      : alignment === 'right' ? { x: 1 - edit.width }
        : alignment === 'top' ? { y: 0 }
          : alignment === 'middle' ? { y: (1 - edit.height) / 2 }
            : { y: 1 - edit.height }
  return clampNormalizedBox({ ...edit, ...position }) as VisualEdit
}

export function duplicateVisualEditToPages(edit: VisualEdit, pageIndices: number[], idFactory: () => string): VisualEdit[] {
  return pageIndices.filter((pageIndex) => pageIndex !== edit.pageIndex).map((pageIndex) => ({ ...edit, id: idFactory(), pageIndex, hidden: false }))
}

export function moveVisualEditLayer(edits: VisualEdit[], id: string, direction: VisualLayerMove): VisualEdit[] {
  const selected = edits.find((edit) => edit.id === id)
  if (!selected) return edits
  const slots = edits.map((edit, index) => edit.pageIndex === selected.pageIndex ? index : -1).filter((index) => index >= 0)
  const pageEdits = slots.map((index) => edits[index])
  const current = pageEdits.findIndex((edit) => edit.id === id)
  if (current < 0) return edits
  const target = direction === 'back' ? 0
    : direction === 'front' ? pageEdits.length - 1
      : direction === 'backward' ? Math.max(0, current - 1)
        : Math.min(pageEdits.length - 1, current + 1)
  if (target === current) return edits
  const reordered = [...pageEdits]
  const [moved] = reordered.splice(current, 1)
  reordered.splice(target, 0, moved)
  const result = [...edits]
  slots.forEach((slot, index) => { result[slot] = reordered[index] })
  return result
}

export function requiresRasterText(text: string) {
  return /[^\u0020-\u007e\n\r\t]/.test(text)
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
  return new Set(edits.filter((edit) => !edit.hidden && edit.type === 'rectangle' && edit.redaction).map((edit) => edit.pageIndex))
}

async function dataUrlBytes(dataUrl: string) {
  return new Uint8Array(await (await fetch(dataUrl)).arrayBuffer())
}

async function rasterTextBytes(text: string, width: number, height: number, fontSize: number, color: string, italic?: boolean) {
  const scale = 3
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(24, Math.ceil(width * scale))
  canvas.height = Math.max(24, Math.ceil(height * scale))
  const context = canvas.getContext('2d')!
  context.scale(scale, scale)
  context.fillStyle = color
  context.font = `${italic ? 'italic ' : ''}${fontSize}px system-ui, sans-serif`
  context.textBaseline = 'top'
  const lineHeight = fontSize * 1.2
  let y = 0
  for (const paragraph of (text || 'Text').split(/\r?\n/)) {
    let line = ''
    for (const character of paragraph) {
      const candidate = line + character
      if (line && context.measureText(candidate).width > width) {
        context.fillText(line, 0, y)
        line = character
        y += lineHeight
        if (y + lineHeight > height) break
      } else {
        line = candidate
      }
    }
    if (y + lineHeight <= height) context.fillText(line, 0, y)
    y += lineHeight
    if (y >= height) break
  }
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Text rendering failed')), 'image/png'))
  canvas.width = 1
  canvas.height = 1
  return new Uint8Array(await blob.arrayBuffer())
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

    for (const edit of edits.filter((item) => item.pageIndex === pageIndex && !item.hidden)) {
      const x = edit.x * width
      const y = height - (edit.y + edit.height) * height
      const editWidth = edit.width * width
      const editHeight = edit.height * height
      const rotation = normalizeVisualRotation(edit.rotation ?? 0)
      const origin = rotatedBoxOrigin(x, y, editWidth, editHeight, rotation)
      const rotated = rotation ? { x: origin.x, y: origin.y, rotate: degrees(rotation) } : { x, y }

      if (edit.type === 'rectangle') {
        const color = hexToRgb(edit.redaction ? '#000000' : edit.color)
        page.drawRectangle({ ...rotated, width: editWidth, height: editHeight, color: rgb(color.r, color.g, color.b), opacity: edit.redaction ? 1 : edit.opacity })
      } else if (edit.type === 'text') {
        const color = hexToRgb(edit.color)
        const size = Math.max(6, Math.min(72, edit.fontSize))
        if (requiresRasterText(edit.text) || rotation) {
          const rasterText = await output.embedPng(await rasterTextBytes(edit.text, editWidth, editHeight, size, edit.color, edit.italic))
          page.drawImage(rasterText, { ...rotated, width: editWidth, height: editHeight })
        } else {
          page.drawText(edit.text || 'Text', {
            x,
            y: Math.max(0, height - edit.y * height - size),
            size,
            maxWidth: Math.max(8, editWidth),
            lineHeight: size * 1.2,
            font: edit.italic ? italicFont : font,
            color: rgb(color.r, color.g, color.b),
          })
        }
      } else if (edit.type === 'image') {
        let embedded = imageCache.get(edit.dataUrl)
        if (!embedded) {
          const bytes = await dataUrlBytes(edit.dataUrl)
          embedded = edit.dataUrl.startsWith('data:image/jpeg') ? await output.embedJpg(bytes) : await output.embedPng(bytes)
          imageCache.set(edit.dataUrl, embedded)
        }
        page.drawImage(embedded, { ...rotated, width: editWidth, height: editHeight })
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
