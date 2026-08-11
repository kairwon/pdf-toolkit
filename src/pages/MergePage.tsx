import { useState, useCallback, useRef } from 'react'
import { FileText, Loader2, Download, X, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import ToolHeader from '../components/ui/ToolHeader'
import FileUpload from '../components/ui/FileUpload'
import PdfViewer from '../components/ui/PdfViewer'
import type { PreviewItem } from '../components/ui/PdfViewer'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import { getPageCount, mergePdfPages } from '../lib/pdf'
import { downloadBlob, triggerDownloadOverlay } from '../lib/utils'
import usePageTitle from '../hooks/usePageTitle'
import usePendingFiles from '../hooks/usePendingFiles'

interface PdfFile {
  id: string
  file: File
  pageCount: number
}

export default function MergePage() {
  usePageTitle('/merge')
  const [files, setFiles] = useState<PdfFile[]>([])
  const [processing, setProcessing] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([])
  const [rotations, setRotations] = useState<Record<number, number>>({})
  const nextPageIdentity = useRef(0)
  const nextFileIdentity = useRef(0)

  const pagesForFiles = useCallback((sourceFiles: PdfFile[]) => {
    const items: PreviewItem[] = []
    sourceFiles.forEach((source) => {
      for (let pageIndex = 0; pageIndex < source.pageCount; pageIndex++) {
        const controlIndex = nextPageIdentity.current++
        items.push({
          id: `${source.id}-page-${pageIndex}`,
          index: pageIndex,
          controlIndex,
          file: source.file,
          label: source.file.name,
        })
      }
    })
    return items
  }, [])

  const addFiles = useCallback(async (newFiles: File[]) => {
    const loaded: PdfFile[] = await Promise.all(
      newFiles.map(async (file, fi) => {
        const total = await getPageCount(file)
        return { id: `file-${nextFileIdentity.current++}-${fi}`, file, pageCount: total }
      }),
    )
    setFiles((prev) => [...prev, ...loaded])
    const items = pagesForFiles(loaded)
    setPreviewItems((prev) => [...prev, ...items])
    setSelected((prev) => new Set([...prev, ...items.map((page) => page.controlIndex!)]))
  }, [pagesForFiles])
  usePendingFiles(addFiles)

  const rebuildPreview = useCallback((updatedFiles: PdfFile[]) => {
    const items = pagesForFiles(updatedFiles)
    setPreviewItems(items)
    setSelected(new Set(items.map((page) => page.controlIndex!)))
    setRotations({})
  }, [pagesForFiles])

  const removeFile = useCallback((id: string) => {
    const updated = files.filter((f) => f.id !== id)
    setFiles(updated)
    rebuildPreview(updated)
  }, [files, rebuildPreview])

  const moveFile = useCallback((dragI: number, dropI: number) => {
    const next = [...files]
    const [moved] = next.splice(dragI, 1)
    next.splice(dropI, 0, moved)
    setFiles(next)
    rebuildPreview(next)
  }, [files, rebuildPreview])

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

  const handleMerge = async () => {
    if (selected.size === 0) { toast.error('Select at least one page'); return }
    setProcessing(true)
    try {
      const finalPages = previewItems
        .filter((page) => selected.has(page.controlIndex!))
        .map((page) => ({
          file: page.file,
          pageIndex: page.index,
          rotation: rotations[page.controlIndex!] || 0,
        }))
      const result = await mergePdfPages(finalPages)
      const blob = new Blob([Uint8Array.from(result).buffer], { type: 'application/pdf' })
      triggerDownloadOverlay('PDF merged!', () => {
        downloadBlob(blob, `merged-${Date.now()}.pdf`)
      })
    } catch {
      toast.error('Merge failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <ToolPageWrapper>
      <ToolHeader title="Merge PDF" description="Combine multiple PDF files locally with no document upload or sign-up. Practical capacity depends on your browser and device memory." />
      {files.length === 0 ? (
        <FileUpload onFiles={addFiles} />
      ) : (
        <div className="space-y-5">
          <div className="p-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
            <div className="flex items-center gap-2 flex-wrap">
              {files.map((f, fi) => (
                <div key={f.id} draggable
                  onDragStart={() => setDragIndex(fi)}
                  onDragOver={(e) => { e.preventDefault(); if (dragIndex !== null && dragIndex !== fi) { moveFile(dragIndex, fi); setDragIndex(fi) } }}
                  onDragEnd={() => setDragIndex(null)}
                  className="flex items-center gap-1.5 bg-gray-50/60 dark:bg-white/[0.04] rounded-lg px-2.5 py-1.5 border border-gray-100 dark:border-gray-700/30 text-sm"
                >
                  <GripVertical size={12} className="text-gray-300 dark:text-gray-600 cursor-grab shrink-0" />
                  <FileText size={13} className="text-jade shrink-0" />
                  <span className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[120px]">{f.file.name}</span>
                  <span className="text-[10px] text-gray-400">({f.pageCount}p)</span>
                  <button onClick={() => removeFile(f.id)} className="text-gray-300 hover:text-red-400 ml-0.5"><X size={12} /></button>
                </div>
              ))}
              <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-400 hover:text-jade ml-1">
                <input type="file" accept=".pdf" multiple className="hidden" onChange={(e) => { const f = Array.from(e.target.files || []); if (f.length) addFiles(f); e.target.value = '' }} />
                <FileText size={12} /> Add
              </label>
            </div>
            <button onClick={() => { setFiles([]); setPreviewItems([]); setSelected(new Set()) }} className="btn-ghost text-gray-400 hover:text-red-400 text-xs">Clear</button>
          </div>

          {previewItems.length > 0 && (
            <PdfViewer
              pages={previewItems}
              selected={selected}
              onToggle={togglePage}
              onSelectAll={() => setSelected(new Set(previewItems.map((page) => page.controlIndex!)))}
              onDeselectAll={() => setSelected(new Set())}
              rotations={rotations}
              onRotatePage={rotatePage}
              onReorderPages={(from, to) => {
                const items = [...previewItems]
                const [moved] = items.splice(from, 1)
                items.splice(to, 0, moved)
                setPreviewItems(items)
              }}
              initialPage={0}
            />
          )}

          <div className="sticky bottom-4 sticky-bar p-4 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-gray-400 whitespace-nowrap">{selected.size} page{selected.size !== 1 ? 's' : ''} selected</span>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <div className="flex items-center gap-1.5 mr-2">
                <span className="text-[11px] font-medium text-gray-400 tracking-wide">ROTATE</span>
                <button onClick={() => handleRotateSelected(-1)} disabled={selected.size === 0} className="btn-secondary text-xs py-1.5 px-2.5" title="Rotate selected counter-clockwise">↺</button>
                <button onClick={() => handleRotateSelected(1)} disabled={selected.size === 0} className="btn-secondary text-xs py-1.5 px-2.5" title="Rotate selected clockwise">↻</button>
              </div>
              <button onClick={handleMerge} disabled={selected.size === 0 || processing} className="btn-primary flex items-center gap-2">
                {processing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                {processing ? 'Merging...' : 'Merge & Download'}
              </button>
            </div>
          </div>
        </div>
      )}
      {processing && <ProcessingOverlay message="Merging PDFs..." />}

      {/* SEO content */}
      <section className="portal-seo-copy" style={{ marginTop: '24px' }}>
        <span>FREE ONLINE PDF MERGER</span>
        <h2>Merge PDF files without uploading — private browser-based tool</h2>
        <p>Merge PDF files in any order directly in your browser. Preview, select, rotate, and rearrange individual pages; the downloaded PDF follows the order shown on screen. No server upload is required.</p>
        <div>
          <article><h3>How to merge PDF files online?</h3><p>Drag and drop your PDF files, reorder them by dragging, select the pages you want to include, and click Merge & Download. The process runs entirely in your browser.</p></article>
          <article><h3>Is it safe to merge PDF files online?</h3><p>Yes. Merging happens locally in your browser memory. Files are never uploaded to Lab of PDF servers. Your documents remain private.</p></article>
          <article><h3>Is there a server upload limit?</h3><p>No server upload limit applies because the PDFs remain in your browser. Very large files or many high-resolution pages can still exceed the available memory on your device.</p></article>
        </div>
      </section>
    </ToolPageWrapper>
  )
}
