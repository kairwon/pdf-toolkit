import './promiseTryPolyfill'
import { PDFDocument, rgb, StandardFonts, degrees, PDFName, PDFArray, PDFDict } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const renderedDocumentCache = new WeakMap<File, ReturnType<typeof pdfjsLib.getDocument>['promise']>()

/** Reuse one parsed PDF.js document while the browser still holds its File. */
function loadRenderedDocument(file: File) {
  const cached = renderedDocumentCache.get(file)
  if (cached) return cached

  const loading = file.arrayBuffer()
    .then((buffer) => pdfjsLib.getDocument({ data: buffer }).promise)
  renderedDocumentCache.set(file, loading)
  void loading.catch(() => renderedDocumentCache.delete(file))
  return loading
}

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
  const pdf = await loadRenderedDocument(file)
  const page = await pdf.getPage(pageNum)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!
  await page.render({ canvas, canvasContext: ctx, viewport }).promise

  return canvas.toDataURL('image/jpeg', 0.85)
}

export async function getPageCount(file: File): Promise<number> {
  const pdf = await loadRenderedDocument(file)
  return pdf.numPages
}

export interface PdfStructureInspection {
  hasForm: boolean
  hasDigitalSignature: boolean
  hasBookmarks: boolean
  hasAttachments: boolean
  hasPageLabels: boolean
}

/** Detect document structures that page editing may invalidate or alter. */
export async function inspectPdfStructure(file: File): Promise<PdfStructureInspection> {
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer())
  const catalog = pdfDoc.catalog
  const form = pdfDoc.getForm()
  const fields = form.getFields()
  const names = catalog.lookupMaybe(PDFName.of('Names'), PDFDict)
  return {
    hasForm: catalog.has(PDFName.of('AcroForm')) || fields.length > 0,
    hasDigitalSignature: fields.some((field) => field.constructor.name === 'PDFSignature'),
    hasBookmarks: catalog.has(PDFName.of('Outlines')),
    hasAttachments: !!names?.get(PDFName.of('EmbeddedFiles')),
    hasPageLabels: catalog.has(PDFName.of('PageLabels')),
  }
}

export interface SubmissionAnalysis {
  pageCount: number
  textStatus: 'searchable' | 'mixed' | 'scanned'
  sampledPages: number
  pageFormat: 'A4' | 'Letter' | 'Mixed / custom'
  landscapePages: number
}

/**
 * Inspect technical properties used by submission portals.
 * Text detection is sampled across the document to keep large theses responsive.
 */
export async function analyzePdfForSubmission(file: File): Promise<SubmissionAnalysis> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const pageCount = pdf.numPages
  const sampleCount = Math.min(pageCount, 24)
  const sampleNumbers = Array.from(
    new Set(Array.from({ length: sampleCount }, (_, index) =>
      Math.max(1, Math.round(1 + index * (pageCount - 1) / Math.max(sampleCount - 1, 1))),
    )),
  )

  let searchableSamples = 0
  let landscapePages = 0
  let a4Pages = 0
  let letterPages = 0

  for (const pageNumber of sampleNumbers) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 1 })
    const shortSide = Math.min(viewport.width, viewport.height)
    const longSide = Math.max(viewport.width, viewport.height)
    if (viewport.width > viewport.height) landscapePages++

    if (Math.abs(shortSide - 595) < 20 && Math.abs(longSide - 842) < 24) a4Pages++
    else if (Math.abs(shortSide - 612) < 20 && Math.abs(longSide - 792) < 24) letterPages++

    const textContent = await page.getTextContent()
    const text = textContent.items.map((item: any) => item.str).join('').trim()
    if (text.length > 20) searchableSamples++
  }

  const textStatus = searchableSamples === sampleNumbers.length
    ? 'searchable'
    : searchableSamples === 0
      ? 'scanned'
      : 'mixed'
  const dominantThreshold = sampleNumbers.length * 0.9
  const pageFormat = a4Pages >= dominantThreshold
    ? 'A4'
    : letterPages >= dominantThreshold
      ? 'Letter'
      : 'Mixed / custom'

  return {
    pageCount,
    textStatus,
    sampledPages: sampleNumbers.length,
    pageFormat,
    landscapePages,
  }
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

export interface MergePageSource {
  file: File
  pageIndex: number
  rotation?: number
}

/** Merge individual pages in the exact order and rotation shown in the UI. */
export async function mergePdfPages(
  sourcePages: MergePageSource[],
  onProgress?: (current: number, total: number) => void,
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create()
  const loadedDocuments = new Map<File, PDFDocument>()

  for (const [outputIndex, source] of sourcePages.entries()) {
    let sourceDocument = loadedDocuments.get(source.file)
    if (!sourceDocument) {
      sourceDocument = await PDFDocument.load(await source.file.arrayBuffer())
      loadedDocuments.set(source.file, sourceDocument)
    }

    const [page] = await mergedPdf.copyPages(sourceDocument, [source.pageIndex])
    const addedRotation = source.rotation ?? 0
    if (addedRotation !== 0) {
      page.setRotation(degrees((page.getRotation().angle + addedRotation + 360) % 360))
    }
    mergedPdf.addPage(page)
    onProgress?.(outputIndex + 1, sourcePages.length)
  }

  return mergedPdf.save()
}

export type ArrangePdfPage =
  | { pageIndex: number; rotation?: number }
  | { blankSize: { width: number; height: number }; rotation?: number }

/** Reorder, rotate, duplicate, omit, or insert blank pages while retaining the source catalog. */
export async function arrangePdfPages(
  file: File,
  pagePlan: ArrangePdfPage[],
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  if (pagePlan.length === 0) throw new Error('A managed PDF must contain at least one page')
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer())
  const originalPages = pdfDoc.getPages()

  for (const item of pagePlan) {
    if ('pageIndex' in item && !originalPages[item.pageIndex]) throw new Error(`Page index ${item.pageIndex} is out of range`)
    if ('blankSize' in item && (item.blankSize.width <= 0 || item.blankSize.height <= 0)) throw new Error('Blank page dimensions must be positive')
  }

  const plannedPages: { item: ArrangePdfPage; page: ReturnType<PDFDocument['getPage']> | null }[] = []
  for (const item of pagePlan) {
    if (signal?.aborted) throw new DOMException('Operation cancelled', 'AbortError')
    if ('blankSize' in item) plannedPages.push({ item, page: null })
    else {
      const [page] = await pdfDoc.copyPages(pdfDoc, [item.pageIndex])
      plannedPages.push({ item, page })
    }
  }

  for (let pageIndex = originalPages.length - 1; pageIndex >= 0; pageIndex--) {
    pdfDoc.removePage(pageIndex)
  }

  for (const [outputIndex, planned] of plannedPages.entries()) {
    if (signal?.aborted) throw new DOMException('Operation cancelled', 'AbortError')
    const page = 'blankSize' in planned.item
      ? pdfDoc.addPage([planned.item.blankSize.width, planned.item.blankSize.height])
      : planned.page!
    const addedRotation = planned.item.rotation ?? 0
    if (addedRotation !== 0) {
      page.setRotation(degrees((page.getRotation().angle + addedRotation + 360) % 360))
    }
    if (!('blankSize' in planned.item)) pdfDoc.addPage(page)
    onProgress?.(outputIndex + 1, pagePlan.length)
  }

  if (signal?.aborted) throw new DOMException('Operation cancelled', 'AbortError')
  return pdfDoc.save()
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
    page.setRotation(degrees((current + rotation) % 360))
  })
  return pdfDoc.save()
}

/**
 * Compress a PDF with an explicit quality trade-off.
 *
 * - "lossless":  copy pages to fresh document, strip unused objects,
 *                save with object-streams.  Best for text-heavy files.
 * - "balanced":  render each page to a compressed image copy.
 * - "aggressive": render a lower-resolution image copy.
 *
 * Balanced / aggressive reduce image-heavy scans but remove searchable text.
 */
export async function compressPdf(
  file: File,
  mode: 'lossless' | 'balanced' | 'aggressive' = 'lossless',
): Promise<Uint8Array> {
  const sourceBuffer = await file.arrayBuffer()
  const pdfDoc = await PDFDocument.load(sourceBuffer.slice(0))
  const newDoc = await PDFDocument.create()
  if (mode !== 'lossless') {
    const renderedPdf = await pdfjsLib.getDocument({ data: sourceBuffer.slice(0) }).promise
    const settings = mode === 'balanced'
      ? { scale: 1.35, quality: .72 }
      : { scale: .95, quality: .52 }

    for (let pageNumber = 1; pageNumber <= renderedPdf.numPages; pageNumber++) {
      const sourcePage = await renderedPdf.getPage(pageNumber)
      const original = sourcePage.getViewport({ scale: 1 })
      const viewport = sourcePage.getViewport({ scale: settings.scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const canvasContext = canvas.getContext('2d', { alpha: false })!
      canvasContext.fillStyle = '#fff'
      canvasContext.fillRect(0, 0, canvas.width, canvas.height)
      await sourcePage.render({ canvas, canvasContext, viewport }).promise
      const jpegBytes = await fetch(canvas.toDataURL('image/jpeg', settings.quality)).then((response) => response.arrayBuffer())
      const image = await newDoc.embedJpg(jpegBytes)
      const page = newDoc.addPage([original.width, original.height])
      page.drawImage(image, { x: 0, y: 0, width: original.width, height: original.height })
      canvas.width = 1
      canvas.height = 1
    }
    return newDoc.save({ useObjectStreams: true })
  }

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
    position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'tile'
    pageIndices?: number[]
    image?: { bytes: ArrayBuffer; mimeType: 'image/png' | 'image/jpeg' }
  } = {},
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer())
  const helvetica = opts.image ? null : await pdfDoc.embedFont(StandardFonts.Helvetica)
  const embeddedImage = opts.image
    ? opts.image.mimeType === 'image/png'
      ? await pdfDoc.embedPng(opts.image.bytes)
      : await pdfDoc.embedJpg(opts.image.bytes)
    : null

  const opacity = opts.opacity ?? 0.2
  const angle = opts.angle ?? -45
  const fontSize = opts.fontSize ?? 48
  const color = opts.color ?? { r: 0.5, g: 0.5, b: 0.5 }
  const position = opts.position ?? 'center'
  const selectedPages = opts.pageIndices ? new Set(opts.pageIndices) : null

  const pages = pdfDoc.getPages()
  for (const [pageIndex, page] of pages.entries()) {
    if (selectedPages && !selectedPages.has(pageIndex)) continue
    const { width, height } = page.getSize()
    const margin = 28
    const imageScale = embeddedImage ? Math.min(1, (width * 0.35) / embeddedImage.width, (height * 0.22) / embeddedImage.height) : 1
    const markWidth = embeddedImage ? embeddedImage.width * imageScale : helvetica!.widthOfTextAtSize(text, fontSize)
    const markHeight = embeddedImage ? embeddedImage.height * imageScale : fontSize
    const coordinates = (slot: Exclude<typeof position, 'tile'>) => {
      if (slot === 'top-left') return { x: margin, y: height - markHeight - margin }
      if (slot === 'top-right') return { x: width - markWidth - margin, y: height - markHeight - margin }
      if (slot === 'bottom-left') return { x: margin, y: margin }
      if (slot === 'bottom-right') return { x: width - markWidth - margin, y: margin }
      return { x: (width - markWidth) / 2, y: (height - markHeight) / 2 }
    }
    const slots = position === 'tile'
      ? [
          { x: width * 0.12, y: height * 0.22 },
          { x: width * 0.52, y: height * 0.22 },
          { x: width * 0.12, y: height * 0.62 },
          { x: width * 0.52, y: height * 0.62 },
        ]
      : [coordinates(position)]

    for (const { x, y } of slots) {
      if (embeddedImage) {
        page.drawImage(embeddedImage, { x, y, width: markWidth, height: markHeight, opacity, rotate: degrees(angle) })
      } else {
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font: helvetica!,
          color: rgb(color.r, color.g, color.b),
          opacity,
          rotate: degrees(angle),
        })
      }
    }
  }

  return pdfDoc.save()
}

export interface WatermarkCandidate {
  id: string
  pageIndex: number
  pageNumber: number
  annotationIndex: number
  subtype: 'Stamp' | 'Watermark'
  label: string
  recommended: boolean
}

export interface WatermarkInspection {
  pageCount: number
  candidates: WatermarkCandidate[]
  hasDigitalSignature: boolean
}

export interface RemoveWatermarkResult {
  bytes: Uint8Array
  removedCount: number
  affectedPages: number[]
}

function pdfNameValue(value: unknown): string {
  if (!value) return ''
  const encoded = (value as { encodedName?: string; asString?: () => string }).encodedName
    ?? (value as { asString?: () => string }).asString?.()
    ?? String(value)
  return encoded.replace(/^\//, '')
}

function pdfTextValue(value: unknown): string {
  if (!value) return ''
  try {
    return ((value as { decodeText?: () => string }).decodeText?.()
      ?? (value as { asString?: () => string }).asString?.()
      ?? String(value)).trim()
  } catch {
    return ''
  }
}

function hasAsciiToken(buffer: ArrayBuffer, token: string): boolean {
  const bytes = new Uint8Array(buffer)
  const pattern = new TextEncoder().encode(token)
  outer: for (let index = 0; index <= bytes.length - pattern.length; index++) {
    for (let offset = 0; offset < pattern.length; offset++) {
      if (bytes[index + offset] !== pattern[offset]) continue outer
    }
    return true
  }
  return false
}

function annotationLabel(pdfDoc: PDFDocument, annotDict: PDFDict): string {
  for (const key of ['Contents', 'T', 'NM', 'Name']) {
    const raw = annotDict.get(PDFName.of(key))
    const resolved = raw ? pdfDoc.context.lookup(raw) : null
    const value = key === 'Name' ? pdfNameValue(resolved) : pdfTextValue(resolved)
    if (value) return value
  }
  return ''
}

function listWatermarkCandidates(pdfDoc: PDFDocument): WatermarkCandidate[] {
  const candidates: WatermarkCandidate[] = []
  for (const [pageIndex, page] of pdfDoc.getPages().entries()) {
    const pageNode = (page as any).node as { get: (key: PDFName) => unknown }
    const annotsRef = pageNode.get(PDFName.of('Annots')) as any
    const annotsArray = annotsRef ? pdfDoc.context.lookup(annotsRef) : null
    if (!(annotsArray instanceof PDFArray)) continue

    for (let annotationIndex = 0; annotationIndex < annotsArray.size(); annotationIndex++) {
      const annotObject = annotsArray.get(annotationIndex) as any
      const annotDict = pdfDoc.context.lookup(annotObject)
      if (!(annotDict instanceof PDFDict)) continue
      const subtypeObject = annotDict.get(PDFName.of('Subtype')) as any
      const subtype = pdfNameValue(subtypeObject ? pdfDoc.context.lookup(subtypeObject) : null)
      if (subtype !== 'Stamp' && subtype !== 'Watermark') continue

      const label = annotationLabel(pdfDoc, annotDict)
      candidates.push({
        id: `${pageIndex}:${annotationIndex}`,
        pageIndex,
        pageNumber: pageIndex + 1,
        annotationIndex,
        subtype,
        label: label || `${subtype} annotation`,
        recommended: subtype === 'Watermark' || /watermark|draft|confidential|sample|copy|do not/i.test(label),
      })
    }
  }
  return candidates
}

/** Inspect removable annotation-layer watermark candidates without changing the PDF. */
export async function inspectWatermarks(file: File): Promise<WatermarkInspection> {
  const buffer = await file.arrayBuffer()
  const pdfDoc = await PDFDocument.load(buffer.slice(0))
  return {
    pageCount: pdfDoc.getPageCount(),
    candidates: listWatermarkCandidates(pdfDoc),
    hasDigitalSignature: hasAsciiToken(buffer, '/ByteRange'),
  }
}

/**
 * Remove only the annotation candidates explicitly selected by the user.
 * Content-stream and scanned-image watermarks are intentionally left untouched.
 */
export async function removeWatermark(file: File, candidateIds: string[]): Promise<RemoveWatermarkResult> {
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer())
  const selected = new Set(candidateIds)
  let removedCount = 0
  const affectedPages = new Set<number>()

  for (const [pageIndex, page] of pdfDoc.getPages().entries()) {
    const pageNode = (page as any).node as { get: (key: PDFName) => unknown; set: (key: PDFName, value: unknown) => void }
    const annotsRef = pageNode.get(PDFName.of('Annots')) as any
    const annotsArray = annotsRef ? pdfDoc.context.lookup(annotsRef) : null
    if (!(annotsArray instanceof PDFArray)) continue

    const kept: any[] = []
    for (let annotationIndex = 0; annotationIndex < annotsArray.size(); annotationIndex++) {
      const annotObject = annotsArray.get(annotationIndex) as any
      if (selected.has(`${pageIndex}:${annotationIndex}`)) {
        removedCount++
        affectedPages.add(pageIndex + 1)
      } else {
        kept.push(annotObject)
      }
    }
    if (kept.length < annotsArray.size()) {
      pageNode.set(PDFName.of('Annots'), pdfDoc.context.obj(kept))
    }
  }

  return {
    bytes: await pdfDoc.save(),
    removedCount,
    affectedPages: [...affectedPages],
  }
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
 * Generate a real Office Open XML Word document from text + optional OCR.
 * Returns a Blob ready for download.
 */
export async function pdfToWord(
  file: File,
  language: string = 'eng',
  onProgress?: (page: number, total: number, status: string) => void,
): Promise<Blob> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const total = pdf.numPages
  const pages: string[] = []
  let ocrWorker: any = null

  for (let i = 1; i <= total; i++) {
    const isText = await pageIsText(pdf, i)
    onProgress?.(i, total, isText ? `Extracting page ${i}...` : `Running OCR on page ${i}...`)

    if (isText) {
      const page = await pdf.getPage(i)
      const tc = await page.getTextContent()
      pages.push(tc.items.map((item: any) => item.str).join(' '))
    } else {
      // OCR path — create worker once and reuse
      if (!ocrWorker) {
        const { createWorker } = await import('tesseract.js')
        ocrWorker = await createWorker(language)
      }
      const dataUrl = await renderPageForOcr(file, i, 2.5)
      const imgBlob = await (await fetch(dataUrl)).blob()
      const { data } = await ocrWorker.recognize(imgBlob)
      pages.push(data.text)
    }
    onProgress?.(i, total, `Page ${i} done`)
  }

  if (ocrWorker) await ocrWorker.terminate()

  return textPagesToWord(pages)
}

export async function textPagesToWord(pages: string[]): Promise<Blob> {
  const { Document, Packer, PageBreak, Paragraph, TextRun } = await import('docx')
  const children = pages.flatMap((text, pageIndex) => {
    const paragraphs = text.split(/\n{2,}|\r?\n/).map((line) => line.trim()).filter(Boolean)
    return [
      ...(pageIndex > 0 ? [new Paragraph({ children: [new PageBreak()] })] : []),
      new Paragraph({ children: [new TextRun({ text: `Page ${pageIndex + 1}`, bold: true, size: 28 })], spacing: { after: 180 } }),
      ...(paragraphs.length > 0 ? paragraphs : ['']).map((line) => new Paragraph({
        children: [new TextRun({ text: line, size: 24 })],
        spacing: { after: 120, line: 360 },
      })),
    ]
  })
  const document = new Document({ sections: [{ properties: {}, children }] })
  return Packer.toBlob(document)
}
