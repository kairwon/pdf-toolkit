import { useState, useCallback, useRef } from 'react'
import { Loader2, Download, Split } from 'lucide-react'
import { toast } from 'sonner'
import ToolHeader from '../components/ui/ToolHeader'
import FileUpload from '../components/ui/FileUpload'
import PdfViewer from '../components/ui/PdfViewer'
import type { PreviewItem } from '../components/ui/PdfViewer'
import PageSelectionControls from '../components/ui/PageSelectionControls'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import { arrangePdfPages, getPageCount } from '../lib/pdfLazy'
import { buildVisiblePagePlan } from '../lib/pageExportPlan'
import { downloadBlob, formatFileSize, triggerDownloadOverlay } from '../lib/utils'
import usePageTitle from '../hooks/usePageTitle'
import usePendingFiles from '../hooks/usePendingFiles'

type SplitMode = 'extract' | 'split'

export default function SplitPage() {
  usePageTitle('/split')
  const [file, setFile] = useState<File | null>(null)
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [rotations, setRotations] = useState<Record<number, number>>({})
  const [mode, setMode] = useState<SplitMode>('extract')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const operationAbort = useRef<AbortController | null>(null)

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

  const handleSplit = async () => {
    if (!file) return
    if (selected.size === 0) { toast.error('Select at least one page'); return }
    if (selected.size === previewItems.length && mode === 'split') { toast.error('Keep at least one page unselected to split into two files'); return }
    setProcessing(true)
    const controller = new AbortController()
    operationAbort.current = controller
    try {
      const visiblePages = previewItems.map((page) => ({ index: page.index, rotation: rotations[page.index] || 0 }))
      const selectedPlan = buildVisiblePagePlan(visiblePages, selected, true)
      if (mode === 'extract') {
        const result = await arrangePdfPages(file, selectedPlan, (current, total) => {
          setProgress(`Preparing selected page ${current} of ${total}…`)
        }, controller.signal)
        const blob = new Blob([Uint8Array.from(result).buffer], { type: 'application/pdf' })
        triggerDownloadOverlay('Pages extracted!', () => {
          downloadBlob(blob, `extracted-${file.name}`)
        })
      } else {
        const unselectedPlan = buildVisiblePagePlan(visiblePages, selected, false)
        const kept = await arrangePdfPages(file, selectedPlan, (current, total) => {
          setProgress(`Preparing selected page ${current} of ${total}…`)
        }, controller.signal)
        const removed = await arrangePdfPages(file, unselectedPlan, (current, total) => {
          setProgress(`Preparing remaining page ${current} of ${total}…`)
        }, controller.signal)
        const outputs = [
          { data: kept, name: `selected-${file.name}` },
          { data: removed, name: `removed-${file.name}` },
        ]
        triggerDownloadOverlay('Split files ready!', () => outputs.forEach(({ data, name }) => {
          downloadBlob(new Blob([Uint8Array.from(data).buffer], { type: 'application/pdf' }), name)
        }))
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') toast.success('Operation cancelled')
      else toast.error('Operation failed')
    } finally {
      setProcessing(false)
      setProgress('')
      operationAbort.current = null
    }
  }

  if (!file) {
    return (
      <ToolPageWrapper>
        <ToolHeader title="Split PDF" description="Split a PDF or extract selected pages locally with no document upload or sign-up. Practical capacity depends on your browser and device memory." />
        <FileUpload onFiles={handleFile} multiple={false} />
      </ToolPageWrapper>
    )
  }

  return (
    <ToolPageWrapper>
      <ToolHeader title="Split PDF" description="Choose which PDF pages to keep, then extract or split." />

      <div className="p-3 mb-5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
        <div className="flex items-center gap-3">
          <div className="bg-jade/10 dark:bg-jade-dark/20 rounded-lg p-2 text-jade"><Split size={16} /></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.name}</span>
          <span className="text-xs text-gray-400">{formatFileSize(file.size)} · {previewItems.length} pages</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMode('extract')} className={`pill text-xs ${mode === 'extract' ? 'pill-active' : 'pill-inactive'}`}>Extract</button>
          <button onClick={() => setMode('split')} className={`pill text-xs ${mode === 'split' ? 'pill-active' : 'pill-inactive'}`}>Split</button>
          <button onClick={() => { setFile(null); setPreviewItems([]); setSelected(new Set()) }} className="btn-ghost text-xs">Change file</button>
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

      <PageSelectionControls
        pageIds={previewItems.map((page) => page.index)}
        selected={selected}
        onChange={setSelected}
        disabled={processing}
      />

      <div className="mt-4 sticky-bar p-4 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm text-gray-400">
          {mode === 'extract' ? `Extract ${selected.size} page${selected.size !== 1 ? 's' : ''}` : `${selected.size} kept, ${previewItems.length - selected.size} removed`}
        </span>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-[11px] font-medium text-gray-400 tracking-wide">ROTATE</span>
            <button onClick={() => handleRotateSelected(-1)} disabled={selected.size === 0} className="btn-secondary text-xs py-1.5 px-2.5" title="Rotate selected counter-clockwise">↺</button>
            <button onClick={() => handleRotateSelected(1)} disabled={selected.size === 0} className="btn-secondary text-xs py-1.5 px-2.5" title="Rotate selected clockwise">↻</button>
          </div>
          <button onClick={handleSplit} disabled={selected.size === 0 || processing} className="btn-primary flex items-center gap-2">
            {processing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {processing ? 'Processing...' : mode === 'extract' ? 'Extract & Download' : 'Split & Download'}
          </button>
        </div>
      </div>
      {processing && <ProcessingOverlay message={progress || (mode === 'extract' ? 'Extracting pages...' : 'Splitting PDF...')} onCancel={() => operationAbort.current?.abort()} />}

      {/* SEO content */}
      <section className="portal-seo-copy" style={{ marginTop: '24px' }}>
        <span>FREE ONLINE PDF SPLITTER</span>
        <h2>Split PDF files or extract pages without uploading</h2>
        <p>Split a large PDF into separate documents or extract only the pages you need. Choose from extract mode (get selected pages) or split mode (keep selected, remove the rest). Entirely browser-based with no file upload.</p>
        <div>
          <article><h3>How to split a PDF online free?</h3><p>Upload your PDF, select the pages you want to keep or extract, choose Extract or Split mode, and download. Both original and extracted files are created locally.</p></article>
          <article><h3>Is splitting a PDF safe?</h3><p>Yes. The PDF never leaves your browser. All splitting and extraction runs locally with no server upload.</p></article>
          <article><h3>Is there a server file limit?</h3><p>No server upload limit applies because processing stays in the browser. Very large documents may still be limited by available device memory.</p></article>
        </div>
      </section>
    </ToolPageWrapper>
  )
}
