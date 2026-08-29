import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowDown, ArrowUp, Download, GripVertical, Loader2, RotateCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolHeader from '../components/ui/ToolHeader'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import { imagesToPdf } from '../lib/pdfLazy'
import { downloadBlob, triggerDownloadOverlay } from '../lib/utils'
import usePageTitle from '../hooks/usePageTitle'

type ImageItem = {
  id: string
  file: File
  preview: string
  rotation: 0 | 90 | 180 | 270
  width: number
  height: number
}

const pageSizeOptions = [
  { value: 'a4', label: 'A4', detail: '210 × 297 mm' },
  { value: 'letter', label: 'Letter', detail: '8.5 × 11 in' },
  { value: 'image', label: 'Match image', detail: 'No white page border' },
] as const

const marginOptions = [
  { value: 0, label: 'None' }, { value: 12, label: 'Tight' }, { value: 24, label: 'Normal' }, { value: 48, label: 'Wide' },
] as const

export default function ImagesToPdfPage() {
  usePageTitle('/images-to-pdf')
  const [items, setItems] = useState<ImageItem[]>([])
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'image'>('a4')
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto')
  const [margin, setMargin] = useState(24)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const directDrag = useRef<{ from: number; pointerId: number } | null>(null)
  const dragTarget = useRef<number | null>(null)
  const operationAbort = useRef<AbortController | null>(null)
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => () => itemsRef.current.forEach((item) => URL.revokeObjectURL(item.preview)), [])

  const addFiles = useCallback(async (files: File[]) => {
    const supported = files.filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    if (supported.length !== files.length) toast.error('Use JPEG, PNG, or WebP images')
    const additions = await Promise.all(supported.map(async (file, index) => {
      const bitmap = await createImageBitmap(file)
      const dimensions = { width: bitmap.width, height: bitmap.height }
      bitmap.close()
      return {
        id: `${Date.now()}-${index}-${file.name}`,
        file,
        preview: URL.createObjectURL(file),
        rotation: 0 as const,
        ...dimensions,
      }
    }))
    setItems((current) => [
      ...current,
      ...additions,
    ])
  }, [])

  const move = (index: number, direction: -1 | 1) => {
    setItems((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const reorder = (from: number, to: number) => {
    if (from === to) return
    setItems((current) => {
      const next = [...current]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  const setDirectDragTarget = (index: number | null) => {
    dragTarget.current = index
    setDragOver(index)
  }

  const beginDirectDrag = (event: ReactPointerEvent<HTMLElement>, index: number) => {
    if (processing) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    directDrag.current = { from: index, pointerId: event.pointerId }
    setDragFrom(index)
    setDirectDragTarget(index)
  }

  const moveDirectDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (directDrag.current?.pointerId !== event.pointerId) return
    event.preventDefault()
    const card = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-image-index]')
    if (card) setDirectDragTarget(Number(card.dataset.imageIndex))
  }

  const endDirectDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const action = directDrag.current
    if (!action || action.pointerId !== event.pointerId) return
    if (dragTarget.current !== null) reorder(action.from, dragTarget.current)
    directDrag.current = null
    setDragFrom(null)
    setDirectDragTarget(null)
  }

  const cancelDirectDrag = () => {
    directDrag.current = null
    setDragFrom(null)
    setDirectDragTarget(null)
  }

  const remove = (id: string) => {
    setItems((current) => {
      const removed = current.find((item) => item.id === id)
      if (removed) URL.revokeObjectURL(removed.preview)
      return current.filter((item) => item.id !== id)
    })
  }

  const rotate = (id: string) => setItems((current) => current.map((item) => item.id === id
    ? { ...item, rotation: ((item.rotation + 90) % 360) as ImageItem['rotation'] }
    : item))

  const pagePreviewSize = (item: ImageItem) => {
    const quarterTurn = item.rotation === 90 || item.rotation === 270
    const imageWidth = quarterTurn ? item.height : item.width
    const imageHeight = quarterTurn ? item.width : item.height
    if (pageSize === 'image') return { width: imageWidth, height: imageHeight, inset: 0 }
    let width = pageSize === 'a4' ? 595.28 : 612
    let height = pageSize === 'a4' ? 841.89 : 792
    if (orientation === 'landscape' || (orientation === 'auto' && imageWidth > imageHeight)) [width, height] = [height, width]
    return { width, height, inset: margin / width * 100 }
  }

  const createPdf = async () => {
    if (items.length === 0) return
    const controller = new AbortController()
    operationAbort.current = controller
    setProcessing(true)
    try {
      const result = await imagesToPdf(
        items.map(({ file, rotation }) => ({ file, rotation })),
        { pageSize, orientation, margin },
        (current, total) => setProgress(`Preparing image ${current} of ${total}`),
        controller.signal,
      )
      const blob = new Blob([Uint8Array.from(result).buffer], { type: 'application/pdf' })
      triggerDownloadOverlay('Image PDF ready', () => downloadBlob(blob, 'images-to-pdf.pdf'), [
        `${items.length} image${items.length === 1 ? '' : 's'}`,
        pageSize === 'image' ? 'Pages match image proportions' : `${pageSize.toUpperCase()} pages`,
      ])
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') toast.success('PDF creation cancelled')
      else toast.error(error instanceof Error ? error.message : 'Could not create the PDF')
    } finally {
      setProcessing(false)
      setProgress('')
      operationAbort.current = null
    }
  }

  return (
    <ToolPageWrapper>
      <ToolHeader title="Images to PDF" description="Turn JPEG, PNG, or WebP images into one ordered PDF locally. Rotate photos, choose the page format, and download without uploading." />

      <FileUpload
        onFiles={addFiles}
        accept={{ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }}
        title="images"
        note="JPEG, PNG, or WebP · processed on this device · no account required"
      />

      {items.length > 0 && <>
        <section className="image-pdf-settings" aria-label="PDF page settings">
          <div className="image-pdf-setting-group"><strong>Page shape</strong><div className="image-pdf-choice-grid" role="radiogroup" aria-label="Page size">
            {pageSizeOptions.map((option) => <button type="button" role="radio" aria-checked={pageSize === option.value} className={pageSize === option.value ? 'active' : ''} disabled={processing} onClick={() => setPageSize(option.value)} key={option.value}><span className={`image-pdf-paper-icon is-${option.value}`} /><b>{option.label}</b><small>{option.detail}</small></button>)}
          </div></div>
          {pageSize !== 'image' && <div className="image-pdf-setting-group"><strong>Orientation</strong><div className="image-pdf-segments" role="radiogroup" aria-label="Page orientation">
            {(['auto', 'portrait', 'landscape'] as const).map((value) => <button type="button" role="radio" aria-checked={orientation === value} className={orientation === value ? 'active' : ''} disabled={processing} onClick={() => setOrientation(value)} key={value}>{value === 'auto' ? 'Fit each image' : value[0].toUpperCase() + value.slice(1)}</button>)}
          </div></div>}
          {pageSize !== 'image' && <div className="image-pdf-setting-group"><strong>White border</strong><div className="image-pdf-segments" role="radiogroup" aria-label="Page margin">
            {marginOptions.map((option) => <button type="button" role="radio" aria-checked={margin === option.value} className={margin === option.value ? 'active' : ''} disabled={processing} onClick={() => setMargin(option.value)} key={option.value}>{option.label}</button>)}
          </div></div>}
        </section>

        <div className="image-pdf-order-heading"><div><strong>Arrange PDF pages</strong><small>Drag a page to reorder it. The white sheet shows the final page, border, and orientation.</small></div><span>{items.length} page{items.length === 1 ? '' : 's'}</span></div>
        <ol className="image-pdf-list">
          {items.map((item, index) => {
            const previewSize = pagePreviewSize(item)
            return <li
              key={item.id}
              data-image-index={index}
              className={`${dragFrom === index ? 'is-dragging' : ''}${dragOver === index ? ' is-drag-over' : ''}`}
            >
            <span className="image-pdf-number">{index + 1}</span>
            <button type="button" className="image-pdf-drag" aria-label={`Drag ${item.file.name} to reorder`} disabled={processing} onPointerDown={(event) => beginDirectDrag(event, index)} onPointerMove={moveDirectDrag} onPointerUp={endDirectDrag} onPointerCancel={cancelDirectDrag}><GripVertical /></button>
            <div className="image-pdf-sheet" style={{ aspectRatio: `${previewSize.width} / ${previewSize.height}`, padding: `${previewSize.inset}%` }} onPointerDown={(event) => beginDirectDrag(event, index)} onPointerMove={moveDirectDrag} onPointerUp={endDirectDrag} onPointerCancel={cancelDirectDrag}>
              <img src={item.preview} alt={`Page ${index + 1}: ${item.file.name}`} draggable={false} style={{ transform: `rotate(${item.rotation}deg)` }} />
            </div>
            <div className="image-pdf-name"><strong>{item.file.name}</strong><small>{item.rotation ? `Rotated ${item.rotation}°` : 'Original orientation'} · drag to reorder</small></div>
            <div className="image-pdf-actions">
              <button type="button" aria-label={`Move ${item.file.name} up`} disabled={processing || index === 0} onClick={() => move(index, -1)}><ArrowUp /></button>
              <button type="button" aria-label={`Move ${item.file.name} down`} disabled={processing || index === items.length - 1} onClick={() => move(index, 1)}><ArrowDown /></button>
              <button type="button" aria-label={`Rotate ${item.file.name}`} disabled={processing} onClick={() => rotate(item.id)}><RotateCw /></button>
              <button type="button" aria-label={`Remove ${item.file.name}`} disabled={processing} onClick={() => remove(item.id)}><Trash2 /></button>
            </div>
          </li>})}
        </ol>

        <div className="sticky-bar image-pdf-download">
          <span>{items.length} image{items.length === 1 ? '' : 's'} in the current order</span>
          <button className="btn-primary" disabled={processing} onClick={createPdf}>
            {processing ? <Loader2 className="animate-spin" /> : <Download />}{processing ? 'Creating PDF…' : 'Create & download PDF'}
          </button>
        </div>
      </>}

      {processing && <ProcessingOverlay message={progress || 'Creating PDF…'} onCancel={() => operationAbort.current?.abort()} />}

      <section className="portal-seo-copy" style={{ marginTop: 24 }}>
        <span>PRIVATE IMAGE TO PDF CONVERTER</span>
        <h2>Combine application photos and scanned images into one PDF</h2>
        <p>Add JPEG, PNG, or WebP images, put them in the required order, rotate them, and create an A4, Letter, or image-sized PDF entirely in your browser.</p>
        <div><article><h3>Do my photos get uploaded?</h3><p>No. Image decoding and PDF creation happen in browser memory on this device.</p></article><article><h3>Which format should I choose?</h3><p>Use A4 or Letter when a portal expects document pages. Match each image when preserving the original proportions matters more.</p></article></div>
      </section>
    </ToolPageWrapper>
  )
}
