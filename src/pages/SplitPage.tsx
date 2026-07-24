import { useState, useCallback } from 'react'
import { Loader2, Download, Split } from 'lucide-react'
import { toast } from 'sonner'
import ToolHeader from '../components/ui/ToolHeader'
import FileUpload from '../components/ui/FileUpload'
import PdfViewer from '../components/ui/PdfViewer'
import type { PreviewItem } from '../components/ui/PdfViewer'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import { renderPageToCanvas, extractPages, splitPdf, getPageCount } from '../lib/pdf'
import { downloadBlob, formatFileSize, triggerDownloadOverlay } from '../lib/utils'

type SplitMode = 'extract' | 'split'

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [rotations, setRotations] = useState<Record<number, number>>({})
  const [mode, setMode] = useState<SplitMode>('extract')
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

  const handleSplit = async () => {
    if (!file) return
    if (selected.size === 0) { toast.error('Select at least one page'); return }
    if (selected.size === previewItems.length && mode === 'split') { toast.error('Keep at least one page unselected to split into two files'); return }
    setProcessing(true)
    try {
      const indices = [...selected].sort((a, b) => a - b)
      if (mode === 'extract') {
        const result = await extractPages(file, indices)
        const blob = new Blob([result], { type: 'application/pdf' })
        triggerDownloadOverlay('Pages extracted!', () => {
          downloadBlob(blob, `extracted-${file.name}`)
        })
      } else {
        const { kept, removed } = await splitPdf(file, indices)
        ;[
          { data: kept, name: `selected-${file.name}` },
          { data: removed, name: `removed-${file.name}` },
        ].forEach(({ data, name }) => {
          const blob = new Blob([data], { type: 'application/pdf' })
          downloadBlob(blob, name)
        })
        toast.success('Download started!')
      }
    } catch {
      toast.error('Operation failed')
    } finally {
      setProcessing(false)
    }
  }

  if (!file) {
    return (
      <ToolPageWrapper>
        <ToolHeader title="Split PDF" description="Extract specific pages from a PDF file online — free, no upload required." />
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

      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-gray-400">{selected.size} page selected</span>
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

      <div className="mt-4 sticky-bar p-4 flex items-center justify-between">
        <span className="text-sm text-gray-400">
          {mode === 'extract' ? `Extract ${selected.size} page${selected.size !== 1 ? 's' : ''}` : `${selected.size} kept, ${previewItems.length - selected.size} removed`}
        </span>
        <button onClick={handleSplit} disabled={selected.size === 0 || processing} className="btn-primary flex items-center gap-2">
          {processing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {processing ? 'Processing...' : mode === 'extract' ? 'Extract & Download' : 'Split & Download'}
        </button>
      </div>
      {processing && <ProcessingOverlay message={mode === 'extract' ? 'Extracting pages...' : 'Splitting PDF...'} />}
    </ToolPageWrapper>
  )
}
