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
import { PDFDocument, degrees } from 'pdf-lib'
import { formatFileSize, downloadBlob, triggerDownloadOverlay } from '../lib/utils'
import usePageTitle from '../hooks/usePageTitle'
import usePendingFiles from '../hooks/usePendingFiles'

export default function ManagePage() {
  usePageTitle('/manage')
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
  usePendingFiles(handleFile)

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
      const blob = new Blob([Uint8Array.from(result).buffer], { type: 'application/pdf' })
      triggerDownloadOverlay('Pages extracted!', () => {
        downloadBlob(blob, `extracted-${file.name}`)
      })
    } catch {
      toast.error('Failed to extract pages')
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (!file || selected.size === 0) return
    if (selected.size === previewItems.length) {
      toast.error('Keep at least one page in the document')
      return
    }
    setProcessing(true)
    try {
      const indices = [...selected].sort((a, b) => a - b)
      const result = await deletePages(file, indices)
      const blob = new Blob([Uint8Array.from(result).buffer], { type: 'application/pdf' })
      triggerDownloadOverlay('Pages removed!', () => {
        downloadBlob(blob, `edited-${file.name}`)
      })
    } catch {
      toast.error('Failed to remove pages')
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
        pdfDoc.getPage(Number(idx)).setRotation(degrees(angle))
      })
      const result = await pdfDoc.save()
      const blob = new Blob([Uint8Array.from(result).buffer], { type: 'application/pdf' })
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
        <ToolHeader title="Manage Pages" description="Delete, rotate, reorder, and extract PDF pages locally with a visual preview. No document upload; practical capacity depends on your device." />
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

      {processing && <ProcessingOverlay message="Processing..." />}

      {/* Sticky action bar */}
      <div className="sticky bottom-4 mt-5 sticky-bar p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-gray-400 whitespace-nowrap">{selected.size > 0 ? `${selected.size} page(s) selected` : 'Select pages to extract'}</span>
          {rotatedByUser > 0 && (
            <span className="text-xs text-amber-600 whitespace-nowrap">{rotatedByUser} page(s) rotated</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-[11px] font-medium text-gray-400 tracking-wide">ROTATE</span>
            <button onClick={() => handleRotateSelected(-1)} disabled={selected.size === 0} className="btn-secondary text-xs py-1.5 px-2.5" title="Rotate selected counter-clockwise">↺</button>
            <button onClick={() => handleRotateSelected(1)} disabled={selected.size === 0} className="btn-secondary text-xs py-1.5 px-2.5" title="Rotate selected clockwise">↻</button>
          </div>
          <button
            onClick={handleExtractSelected}
            disabled={selected.size === 0 || processing}
            className="btn-primary flex items-center gap-2"
          >
            {processing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            Extract &amp; Download
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selected.size === 0 || processing}
            className="btn-secondary"
          >
            Remove selected
          </button>
          {rotatedByUser > 0 && (
            <button
              onClick={handleApplyRotation}
              disabled={processing}
              className="btn-primary flex items-center gap-2"
            >
              {processing ? <Loader2 size={15} className="animate-spin" /> : <span>Save rotated PDF</span>}
            </button>
          )}
        </div>
      </div>

      {/* SEO content */}
      <section className="portal-seo-copy" style={{ marginTop: '24px' }}>
        <span>FREE ONLINE PDF PAGE MANAGER</span>
        <h2>Edit PDF pages online free — delete, rotate, reorder, and extract</h2>
        <p>Manage PDF pages entirely in your browser: delete unwanted pages, rotate pages, reorder them by dragging, and extract selected pages into a new PDF. No document upload or sign-up.</p>
        <div>
          <article><h3>How to edit PDF pages online for free?</h3><p>Upload your PDF, then use the visual page thumbnails to select, rotate, or reorder pages. Delete unwanted pages and download the edited PDF — all in your browser.</p></article>
          <article><h3>Is this PDF editor safe to use?</h3><p>Yes. Page management runs entirely in your browser. Files are never uploaded. Your documents stay private on your device.</p></article>
          <article><h3>Can I edit PDF pages without uploading?</h3><p>Yes. Uploading in this context means selecting a file from your device. The file content is processed in browser memory and never sent to any server.</p></article>
        </div>
      </section>
    </ToolPageWrapper>
  )
}
