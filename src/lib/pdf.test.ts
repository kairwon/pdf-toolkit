import { describe, expect, it } from 'vitest'
import { PDFDocument, PDFName, PDFString } from 'pdf-lib'

Object.defineProperty(globalThis, 'DOMMatrix', { value: class DOMMatrix {} })
Object.defineProperty(globalThis, 'ImageData', { value: class ImageData {} })
Object.defineProperty(globalThis, 'Path2D', { value: class Path2D {} })

const { addWatermark, inspectWatermarks, removeWatermark, textPagesToWord } = await import('./pdf')

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
