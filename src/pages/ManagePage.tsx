import { useState, useCallback } from 'react'
import { Loader2, Download } from 'lucide-react'
import { toast } from 'sonner'
import ToolHeader from '../components/ui/ToolHeader'
import FileUpload from '../components/ui/FileUpload'
import PdfViewer from '../components/ui/PdfViewer'
import type { PreviewItem } from '../components/ui/PdfViewer'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import { renderPageToCanvas, deletePages, extractPages, getPageCount } from '../lib/pdf'
import { PDFDocument } from 'pdf-lib'
import { formatFileSize, downloadBlob, triggerDownloadOverlay } from '../lib/utils'

export default function ManagePage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [rotations, setRotations] = useState<Record<number, number>>({})
  const [processing, setProcessing] = useState(false)

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setProcessing(true)
    try {
      const total = await getPageCount(f)
      const items = Array.from({ length: total }, (_, i) => ({ index: i, file: f, label: f.name }))
      setFile(f)
      setPreviewItems(items)
      setSelected(new Set())
      setRotations({})
      toast.success(`Loaded ${total} pages`)
    } catch {
      toast.error('Failed to load PDF')
    } finally {
      setProcessing(false)
    }
  }, [])

  const togglePage = useCallback((pageIndex: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(pageIndex)) next.delete(pageIndex)
      else next.add(pageIndex)
      return next
    })
  }, [])

  const rotatePage = useCallback((pageIndex: number, direction: 1 | -1) => {
    setRotations((prev) => {
      const current = prev[pageIndex] || 0
      return { ...prev, [pageIndex]: ((current + direction * 90) % 360 + 360) % 360 }
    })
  }, [])

  const handleRotateSelected = (direction: 1 | -1) => {
    selected.forEach((idx) => rotatePage(idx, direction))
  }

  const handleExtractSelected = async () => {
    if (!file || selected.size === 0) return
    setProcessing(true)
    try {
      const indices = [...selected].sort((a, b) => a - b)
      const result = await extractPages(file, indices)
      const blob = new Blob([result], { type: 'application/pdf' })
      triggerDownloadOverlay('Pages extracted!', () => {
        downloadBlob(blob, `extracted-${file.name}`)
      })
    } catch {
      toast.error('Failed to extract pages')
    } finally {
      setProcessing(false)
    }
  }

  const handleApplyRotation = async () => {
    if (!file) return
    setProcessing(true)
    try {
      const pdfDoc = await PDFDocument.load(await file.arrayBuffer())
      Object.entries(rotations).filter(([, v]) => v !== 0).forEach(([idx, angle]) => {
        pdfDoc.getPage(Number(idx)).setRotation({ angle })
      })
      const result = await pdfDoc.save()
      const blob = new Blob([result], { type: 'application/pdf' })
      triggerDownloadOverlay('Rotation saved!', () => {
        downloadBlob(blob, `rotated-${file.name}`)
      })
      setFile(null); setPreviewItems([]); setSelected(new Set())
    } catch {
      toast.error('Failed to rotate pages')
    } finally {
      setProcessing(false)
    }
  }

  const rotatedByUser = Object.entries(rotations).filter(([, a]) => a !== 0).length

  if (!file) {
    return (
      <ToolPageWrapper>
        <ToolHeader title="Manage Pages" description="Delete, rotate, or extract PDF pages online — free & browser-based." />
        <FileUpload onFiles={handleFile} multiple={false} />
      </ToolPageWrapper>
    )
  }

  return (
    <ToolPageWrapper>
      <ToolHeader title="Manage Pages" description="Select PDF pages and perform actions — free online PDF page manager." />

      <div className="p-3 mb-5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
        <div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.name}</span>
          <span className="text-xs text-gray-400 ml-2">{formatFileSize(file.size)} · {previewItems.length} pages</span>
        </div>
        <button onClick={() => { setFile(null); setPreviewItems([]); setSelected(new Set()) }} className="btn-ghost text-xs">Change file</button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-400">{selected.size > 0 ? `${selected.size} page selected` : 'Select pages'}</span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium text-gray-400 tracking-wide">BATCH ROTATE</span>
          <div className="flex gap-1">
            <button onClick={() => handleRotateSelected(-1)} disabled={selected.size === 0} className="btn-secondary text-xs py-1.5 px-2.5">↺</button>
            <button onClick={() => handleRotateSelected(1)} disabled={selected.size === 0} className="btn-secondary text-xs py-1.5 px-2.5">↻</button>
          </div>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
          <button onClick={handleExtractSelected} disabled={selected.size === 0 || processing} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 text-jade border-[#dde4d8]"><Download size={13} /> Extract</button>
        </div>
      </div>

      <PdfViewer
        pages={previewItems}
        selected={selected}
        onToggle={togglePage}
        onSelectAll={() => setSelected(new Set(previewItems.map((p) => p.index)))}
        onDeselectAll={() => setSelected(new Set())}
        rotations={rotations}
        onRotatePage={rotatePage}
        onReorderPages={(from, to) => {
          const items = [...previewItems]
          const [moved] = items.splice(from, 1)
          items.splice(to, 0, moved)
          setPreviewItems(items)
        }}
      />

      {rotatedByUser > 0 && (
        <div className="sticky bottom-4 mt-5 sticky-bar p-4 flex items-center justify-between">
          <span className="text-sm text-gray-400">{rotatedByUser} page(s) rotated</span>
          <button onClick={handleApplyRotation} disabled={processing} className="btn-primary flex items-center gap-2">
            {processing ? <Loader2 size={15} className="animate-spin" /> : <span>Save rotated PDF</span>}
          </button>
        </div>
      )}
      {processing && <ProcessingOverlay message="Processing..." />}
    </ToolPageWrapper>
  )
}
