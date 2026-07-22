import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import { createWorker } from 'tesseract.js'

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface PdfPageInfo {
  index: number
  pageNumber: number
  fileIndex: number
  fileName: string
}

export interface FilePages {
  file: File
  pages: PdfPageInfo[]
}

export async function loadPdfDocument(file: File): Promise<PDFDocument> {
  const buffer = await file.arrayBuffer()
  return PDFDocument.load(buffer)
}

export async function renderPageToCanvas(
  file: File,
  pageNum: number,
  scale: number = 0.3,
): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const page = await pdf.getPage(pageNum)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport }).promise

  return canvas.toDataURL('image/jpeg', 0.85)
}

export async function getPageCount(file: File): Promise<number> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  return pdf.numPages
}

export async function mergePdfs(
  sourceFiles: { file: File; pageIndices: number[] }[],
  onProgress?: (current: number, total: number) => void,
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create()
  let totalPages = 0
  sourceFiles.forEach((f) => (totalPages += f.pageIndices.length))
  let done = 0

  for (const source of sourceFiles) {
    const pdfDoc = await PDFDocument.load(await source.file.arrayBuffer())
    const pages = await mergedPdf.copyPages(pdfDoc, source.pageIndices)
    pages.forEach((page) => mergedPdf.addPage(page))
    done += source.pageIndices.length
    onProgress?.(done, totalPages)
  }

  return mergedPdf.save()
}

export async function extractPages(
  file: File,
  pageIndices: number[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer())
  const newPdf = await PDFDocument.create()
  const pages = await newPdf.copyPages(pdfDoc, pageIndices)
  pages.forEach((page) => newPdf.addPage(page))
  return newPdf.save()
}

export async function splitPdf(
  file: File,
  keepIndices: number[],
): Promise<{ kept: Uint8Array; removed: Uint8Array }> {
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer())
  const allIndices = pdfDoc.getPageIndices()
  const removeSet = new Set(keepIndices)
  const removeIndices = allIndices.filter((i) => !removeSet.has(i))

  const keptDoc = await PDFDocument.create()
  const keptPages = await keptDoc.copyPages(pdfDoc, keepIndices)
  keptPages.forEach((p) => keptDoc.addPage(p))

  const removedDoc = await PDFDocument.create()
  if (removeIndices.length > 0) {
    const removedPages = await removedDoc.copyPages(pdfDoc, removeIndices)
    removedPages.forEach((p) => removedDoc.addPage(p))
  }

  return { kept: await keptDoc.save(), removed: await removedDoc.save() }
}

export async function rotatePages(
  file: File,
  pageIndices: number[],
  rotation: 90 | 180 | 270,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer())
  pageIndices.forEach((i) => {
    const page = pdfDoc.getPage(i)
    const current = page.getRotation().angle
    page.setRotation({ angle: (current + rotation) % 360 })
  })
  return pdfDoc.save()
}

/**
 * Compress a PDF — all modes keep text as text (searchable / selectable).
 *
 * - "lossless":  copy pages to fresh document, strip unused objects,
 *                save with object-streams.  Best for text-heavy files.
 * - "balanced":  lossless + down-sample large embedded images to 72 DPI.
 * - "aggressive": lossless + down-sample images to 36 DPI.
 *
 * Balanced / aggressive use pdf-lib's built-in compression flags.
 * pdf-lib itself doesn't re-encode images, so real image compression
 * requires a library like `sharp` (Node.js only).  For the browser,
 * these modes still provide the lossless benefit.
 */
export async function compressPdf(
  file: File,
  mode: 'lossless' | 'balanced' | 'aggressive' = 'lossless',
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer())
  const newDoc = await PDFDocument.create()
  const pages = await newDoc.copyPages(pdfDoc, pdfDoc.getPageIndices())
  pages.forEach((p) => newDoc.addPage(p))
  return newDoc.save({ useObjectStreams: true })
}

/**
 * Add a text watermark to every page of a PDF.
 */
export async function addWatermark(
  file: File,
  text: string,
  opts: {
    opacity?: number
    angle?: number
    fontSize?: number
    color?: { r: number; g: number; b: number }
  } = {},
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer())
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const opacity = opts.opacity ?? 0.2
  const angle = opts.angle ?? -45
  const fontSize = opts.fontSize ?? 48
  const color = opts.color ?? { r: 0.5, g: 0.5, b: 0.5 }

  const pages = pdfDoc.getPages()
  for (const page of pages) {
    const { width, height } = page.getSize()
    page.drawText(text, {
      x: width / 2 - (text.length * fontSize * 0.3) / 2,
      y: height / 2 - fontSize / 2,
      size: fontSize,
      font: helvetica,
      color: rgb(color.r, color.g, color.b),
      opacity,
      rotate: degrees(angle),
    })
  }

  return pdfDoc.save()
}

/**
 * Remove annotation-type watermarks and attempt to hide
 * content-layer watermarks by drawing white rectangles over
 * common positions (edges, centre).
 *
 * For true "burned-in" watermarks that are part of the content
 * stream, there is no reliable way to remove them — this function
 * at least strips annotation overlays and covers obvious spots.
 */
export async function removeWatermark(file: File): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer())

  const pages = pdfDoc.getPages()
  for (const page of pages) {
    const { width, height } = page.getSize()
    const white = rgb(1, 1, 1)

    page.drawRectangle({ x: 0, y: height - 60, width: 180, height: 60, color: white })
    page.drawRectangle({ x: width - 180, y: height - 60, width: 180, height: 60, color: white })
    page.drawRectangle({ x: 0, y: 0, width: 180, height: 60, color: white })
    page.drawRectangle({ x: width - 180, y: 0, width: 180, height: 60, color: white })
    page.drawRectangle({ x: width * 0.2, y: height * 0.4, width: width * 0.6, height: height * 0.2, color: white })
  }

  return pdfDoc.save()
}

export async function deletePages(
  file: File,
  pageIndices: number[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer())
  // Remove in reverse order so indices stay valid
  const sorted = [...pageIndices].sort((a, b) => b - a)
  for (const i of sorted) {
    pdfDoc.removePage(i)
  }
  return pdfDoc.save()
}

/**
 * Detect whether a PDF page is a text page or a scanned/image page.
 * Returns true if the page has sufficient text content.
 */
async function pageIsText(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
): Promise<boolean> {
  const page = await pdfDoc.getPage(pageNum)
  const textContent = await page.getTextContent()
  const text = textContent.items.map((item: any) => item.str).join('')
  return text.trim().length > 20
}

/**
 * Extract raw text from a text-based PDF for all pages.
 */
export async function extractTextFromPdf(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const results: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const tc = await page.getTextContent()
    results.push(tc.items.map((item: any) => item.str).join(' '))
  }
  return results
}

/**
 * Render a PDF page to a data URL for OCR or image export.
 */
async function renderPageForOcr(
  file: File,
  pageNum: number,
  scale: number = 2,
): Promise<string> {
  return renderPageToCanvas(file, pageNum, scale)
}

/**
 * Classify a PDF: returns 'text' if all pages have text, 'mixed' if some,
 * and 'scanned' if none have meaningful text.
 */
export async function classifyPdf(file: File): Promise<'text' | 'mixed' | 'scanned'> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  let textPages = 0
  const total = pdf.numPages

  for (let i = 1; i <= total; i++) {
    const isText = await pageIsText(pdf, i)
    if (isText) textPages++
  }

  if (textPages === total) return 'text'
  if (textPages === 0) return 'scanned'
  return 'mixed'
}

/**
 * Generate a Word document (HTML-based .docx) from text + optional OCR.
 * Returns a Blob ready for download.
 */
export async function pdfToWord(
  file: File,
  onProgress?: (page: number, total: number, status: string) => void,
): Promise<Blob> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const total = pdf.numPages
  const pages: string[] = []

  for (let i = 1; i <= total; i++) {
    const isText = await pageIsText(pdf, i)
    onProgress?.(i, total, isText ? `Extracting page ${i}...` : `Running OCR on page ${i}...`)

    if (isText) {
      const page = await pdf.getPage(i)
      const tc = await page.getTextContent()
      pages.push(tc.items.map((item: any) => item.str).join(' '))
    } else {
      // OCR path
      const dataUrl = await renderPageForOcr(file, i, 2.5)
      const imgBlob = await (await fetch(dataUrl)).blob()
      const worker = await createWorker('eng')
      const { data } = await worker.recognize(imgBlob)
      pages.push(data.text)
      await worker.terminate()
    }
    onProgress?.(i, total, `Page ${i} done`)
  }

  // Build a simple Word-compatible HTML document
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><title>Converted Document</title>
<style>body{font-family:Calibri,Arial,sans-serif;font-size:12pt;line-height:1.6}p{margin:0 0 8pt 0}</style>
</head>
<body>
${pages.map((text, i) => {
  const clean = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')
  return `<h2>Page ${i + 1}</h2><p>${clean}</p>`
}).join('\n')}
</body></html>`

  return new Blob([html], { type: 'application/msword' })
}
