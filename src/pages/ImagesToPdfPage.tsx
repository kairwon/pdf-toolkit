import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Download, Loader2, RotateCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolHeader from '../components/ui/ToolHeader'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import { imagesToPdf } from '../lib/pdf'
import { downloadBlob, triggerDownloadOverlay } from '../lib/utils'
import usePageTitle from '../hooks/usePageTitle'

type ImageItem = {
  id: string
  file: File
  preview: string
  rotation: 0 | 90 | 180 | 270
}

export default function ImagesToPdfPage() {
  usePageTitle('/images-to-pdf')
  const [items, setItems] = useState<ImageItem[]>([])
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'image'>('a4')
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto')
  const [margin, setMargin] = useState(24)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const operationAbort = useRef<AbortController | null>(null)
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => () => itemsRef.current.forEach((item) => URL.revokeObjectURL(item.preview)), [])

  const addFiles = useCallback((files: File[]) => {
    const supported = files.filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    if (supported.length !== files.length) toast.error('Use JPEG, PNG, or WebP images')
    setItems((current) => [
      ...current,
      ...supported.map((file, index) => ({
        id: `${Date.now()}-${index}-${file.name}`,
        file,
        preview: URL.createObjectURL(file),
        rotation: 0 as const,
      })),
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
          <label>Page size
            <select value={pageSize} onChange={(event) => setPageSize(event.target.value as typeof pageSize)} disabled={processing}>
              <option value="a4">A4</option><option value="letter">Letter</option><option value="image">Match each image</option>
            </select>
          </label>
          {pageSize !== 'image' && <label>Orientation
            <select value={orientation} onChange={(event) => setOrientation(event.target.value as typeof orientation)} disabled={processing}>
              <option value="auto">Automatic</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option>
            </select>
          </label>}
          {pageSize !== 'image' && <label>Margin: {margin} pt
            <input aria-label="Page margin" type="range" min="0" max="72" value={margin} disabled={processing} onChange={(event) => setMargin(Number(event.target.value))} />
          </label>}
        </section>

        <ol className="image-pdf-list">
          {items.map((item, index) => <li key={item.id}>
            <span className="image-pdf-number">{index + 1}</span>
            <img src={item.preview} alt="" style={{ transform: `rotate(${item.rotation}deg)` }} />
            <div><strong>{item.file.name}</strong><small>{item.rotation ? `Rotated ${item.rotation}°` : 'Original orientation'}</small></div>
            <div className="image-pdf-actions">
              <button type="button" aria-label={`Move ${item.file.name} up`} disabled={processing || index === 0} onClick={() => move(index, -1)}><ArrowUp /></button>
              <button type="button" aria-label={`Move ${item.file.name} down`} disabled={processing || index === items.length - 1} onClick={() => move(index, 1)}><ArrowDown /></button>
              <button type="button" aria-label={`Rotate ${item.file.name}`} disabled={processing} onClick={() => rotate(item.id)}><RotateCw /></button>
              <button type="button" aria-label={`Remove ${item.file.name}`} disabled={processing} onClick={() => remove(item.id)}><Trash2 /></button>
            </div>
          </li>)}
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
