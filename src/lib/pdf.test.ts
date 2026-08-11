import { describe, expect, it, vi } from 'vitest'
import { degrees, PDFDocument, PDFName, PDFString } from 'pdf-lib'

const { getDocumentMock } = vi.hoisted(() => ({ getDocumentMock: vi.fn() }))
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: getDocumentMock,
}))

Object.defineProperty(globalThis, 'DOMMatrix', { value: class DOMMatrix {} })
Object.defineProperty(globalThis, 'ImageData', { value: class ImageData {} })
Object.defineProperty(globalThis, 'Path2D', { value: class Path2D {} })

const { addWatermark, arrangePdfPages, getPageCount, inspectPdfStructure, inspectWatermarks, mergePdfPages, removeWatermark, textPagesToWord } = await import('./pdf')

async function createAnnotationPdf() {
  const document = await PDFDocument.create()
  const page = document.addPage([612, 792])
  const stamp = document.context.obj({
    Type: 'Annot',
    Subtype: 'Stamp',
    Rect: [40, 40, 180, 90],
    Contents: PDFString.of('APPROVED'),
  })
  const watermark = document.context.obj({
    Type: 'Annot',
    Subtype: 'Watermark',
    Rect: [120, 260, 490, 530],
    Contents: PDFString.of('CONFIDENTIAL WATERMARK'),
  })
  page.node.set(PDFName.of('Annots'), document.context.obj([
    document.context.register(stamp),
    document.context.register(watermark),
  ]))
  const bytes = await document.save()
  return new File([Uint8Array.from(bytes).buffer], 'annotations.pdf', { type: 'application/pdf' })
}

describe('watermark annotation inspection', () => {
  it('recognizes slash-prefixed Stamp and Watermark PDF names', async () => {
    const inspection = await inspectWatermarks(await createAnnotationPdf())

    expect(inspection.pageCount).toBe(1)
    expect(inspection.candidates).toHaveLength(2)
    expect(inspection.candidates.map((candidate) => candidate.subtype)).toEqual(['Stamp', 'Watermark'])
    expect(inspection.candidates[0].recommended).toBe(false)
    expect(inspection.candidates[1].recommended).toBe(true)
  })

  it('removes only candidates explicitly selected by the user', async () => {
    const file = await createAnnotationPdf()
    const inspection = await inspectWatermarks(file)
    const watermark = inspection.candidates.find((candidate) => candidate.subtype === 'Watermark')!
    const result = await removeWatermark(file, [watermark.id])
    const cleaned = new File([Uint8Array.from(result.bytes).buffer], 'cleaned.pdf', { type: 'application/pdf' })
    const remaining = await inspectWatermarks(cleaned)

    expect(result.removedCount).toBe(1)
    expect(result.affectedPages).toEqual([1])
    expect(remaining.candidates).toHaveLength(1)
    expect(remaining.candidates[0].subtype).toBe('Stamp')
    expect(remaining.candidates[0].label).toBe('APPROVED')
  })
})

describe('PDF output formats', () => {
  it('reuses a parsed preview document for repeated reads of the same file', async () => {
    const document = await PDFDocument.create()
    document.addPage([210, 297])
    document.addPage([210, 297])
    const file = new File([Uint8Array.from(await document.save()).buffer], 'cached-preview.pdf', { type: 'application/pdf' })
    const arrayBuffer = vi.spyOn(file, 'arrayBuffer')
    getDocumentMock.mockReturnValue({ promise: Promise.resolve({ numPages: 2 }) })

    expect(await getPageCount(file)).toBe(2)
    expect(await getPageCount(file)).toBe(2)
    expect(arrayBuffer).toHaveBeenCalledTimes(1)
  })

  it('merges pages in the requested cross-file order and applies UI rotations', async () => {
    const firstDocument = await PDFDocument.create()
    firstDocument.addPage([210, 310])
    firstDocument.addPage([220, 320])
    const secondDocument = await PDFDocument.create()
    secondDocument.addPage([230, 330])
    const firstFile = new File([Uint8Array.from(await firstDocument.save()).buffer], 'first.pdf', { type: 'application/pdf' })
    const secondFile = new File([Uint8Array.from(await secondDocument.save()).buffer], 'second.pdf', { type: 'application/pdf' })

    const result = await mergePdfPages([
      { file: secondFile, pageIndex: 0, rotation: 90 },
      { file: firstFile, pageIndex: 1 },
      { file: firstFile, pageIndex: 0, rotation: 270 },
    ])
    const merged = await PDFDocument.load(result)

    expect(merged.getPages().map((page) => page.getSize().width)).toEqual([230, 220, 210])
    expect(merged.getPages().map((page) => page.getRotation().angle)).toEqual([90, 0, 270])
  })

  it('builds a managed-page selection in visible order and preserves existing rotation', async () => {
    const document = await PDFDocument.create()
    document.setTitle('Managed document metadata')
    document.addPage([310, 410])
    document.addPage([320, 420])
    const thirdPage = document.addPage([330, 430])
    thirdPage.setRotation(degrees(90))
    const file = new File([Uint8Array.from(await document.save()).buffer], 'managed.pdf', { type: 'application/pdf' })

    const result = await arrangePdfPages(file, [
      { pageIndex: 2, rotation: 90 },
      { pageIndex: 0, rotation: 270 },
    ])
    const managed = await PDFDocument.load(result)

    expect(managed.getPages().map((page) => page.getSize().width)).toEqual([330, 310])
    expect(managed.getPages().map((page) => page.getRotation().angle)).toEqual([180, 270])
    expect(managed.getTitle()).toBe('Managed document metadata')
  })

  it('duplicates source pages and inserts sized blank pages in a managed PDF', async () => {
    const document = await PDFDocument.create()
    document.addPage([310, 410])
    document.addPage([320, 420])
    const file = new File([Uint8Array.from(await document.save()).buffer], 'duplicate-and-blank.pdf', { type: 'application/pdf' })

    const result = await arrangePdfPages(file, [
      { pageIndex: 1 },
      { pageIndex: 1, rotation: 90 },
      { blankSize: { width: 595, height: 842 } },
      { pageIndex: 0 },
    ])
    const managed = await PDFDocument.load(result)

    expect(managed.getPages().map((page) => page.getSize().width)).toEqual([320, 320, 595, 310])
    expect(managed.getPages().map((page) => page.getRotation().angle)).toEqual([0, 90, 0, 0])
  })

  it('reports managed-page progress and honors cancellation', async () => {
    const document = await PDFDocument.create()
    document.addPage([310, 410])
    document.addPage([320, 420])
    const file = new File([Uint8Array.from(await document.save()).buffer], 'progress.pdf', { type: 'application/pdf' })
    const progress: string[] = []

    await arrangePdfPages(file, [{ pageIndex: 0 }, { pageIndex: 1 }], (current, total) => progress.push(`${current}/${total}`))
    expect(progress).toEqual(['1/2', '2/2'])

    const controller = new AbortController()
    controller.abort()
    await expect(arrangePdfPages(file, [{ pageIndex: 0 }], undefined, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('adds a text watermark only to selected pages', async () => {
    const document = await PDFDocument.create()
    document.addPage([612, 792])
    document.addPage([612, 792])
    const source = await document.save()
    const file = new File([Uint8Array.from(source).buffer], 'two-pages.pdf', { type: 'application/pdf' })
    const result = await addWatermark(file, 'DRAFT', { pageIndices: [1], position: 'bottom-right' })
    const watermarked = await PDFDocument.load(result)

    expect(watermarked.getPage(0).node.get(PDFName.of('Contents'))).toBeUndefined()
    expect(watermarked.getPage(1).node.get(PDFName.of('Contents'))).toBeDefined()
  })

  it('creates a real zipped DOCX package instead of HTML with a .doc extension', async () => {
    const blob = await textPagesToWord(['A searchable PDF becomes a Word document.'])
    const signature = new Uint8Array(await blob.slice(0, 2).arrayBuffer())

    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    expect([...signature]).toEqual([0x50, 0x4b])
  })
})

describe('PDF structure inspection', () => {
  it('detects forms, bookmarks, attachments, and custom page labels', async () => {
    const document = await PDFDocument.create()
    document.addPage([612, 792])
    document.getForm().createTextField('student.name')
    document.catalog.set(PDFName.of('Outlines'), document.context.obj({ Type: 'Outlines' }))
    document.catalog.set(PDFName.of('PageLabels'), document.context.obj({ Nums: [] }))
    document.catalog.set(PDFName.of('Names'), document.context.obj({ EmbeddedFiles: { Names: [] } }))
    const file = new File([Uint8Array.from(await document.save()).buffer], 'structured.pdf', { type: 'application/pdf' })

    await expect(inspectPdfStructure(file)).resolves.toMatchObject({
      hasForm: true,
      hasBookmarks: true,
      hasAttachments: true,
      hasPageLabels: true,
    })
  })
})
