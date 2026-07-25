import { useState, useCallback } from 'react'
import { FileText, Loader2, Download, X, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import ToolHeader from '../components/ui/ToolHeader'
import FileUpload from '../components/ui/FileUpload'
import PdfViewer from '../components/ui/PdfViewer'
import type { PreviewItem } from '../components/ui/PdfViewer'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import { getPageCount, mergePdfs } from '../lib/pdf'
import { PDFDocument } from 'pdf-lib'
import { formatFileSize, downloadBlob, triggerDownloadOverlay } from '../lib/utils'
import usePageTitle from '../hooks/usePageTitle'

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

  const addFiles = useCallback(async (newFiles: File[]) => {
    const loaded: PdfFile[] = await Promise.all(
      newFiles.map(async (file, fi) => {
        const total = await getPageCount(file)
        return { id: `file-${Date.now()}-${fi}`, file, pageCount: total }
      }),
    )
    setFiles((prev) => [...prev, ...loaded])
    const items: PreviewItem[] = []
    loaded.forEach((f) => {
      for (let i = 0; i < f.pageCount; i++) items.push({ index: i, file: f.file, label: f.file.name })
    })
    setPreviewItems((prev) => [...prev, ...items])
    setSelected((prev) => new Set([...prev, ...items.map((p) => p.index)]))
  }, [])

  const rebuildPreview = useCallback((updatedFiles: PdfFile[]) => {
    const items: PreviewItem[] = []
    updatedFiles.forEach((f) => {
      for (let i = 0; i < f.pageCount; i++) items.push({ index: i, file: f.file, label: f.file.name })
    })
    setPreviewItems(items)
    setSelected(new Set(items.map((p) => p.index)))
    setRotations({})
  }, [])

  const removeFile = useCallback((id: string) => {
    const updated = files.filter((f) => f.id !== id)
    setFiles(updated)
    rebuildPreview(updated)
  }, [files, rebuildPreview])

  const moveFile = useCallback((dragI: number, dropI: number) => {
    setFiles((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragI, 1)
      next.splice(dropI, 0, moved)
      rebuildPreview(next)
      return next
    })
  }, [rebuildPreview])

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
    if (selected.size === 0) return
    setProcessing(true)
    try {
      const byFile: Record<string, { file: File; indices: number[] }> = {}
      let flat = 0
      for (const f of files) {
        for (let i = 0; i < f.pageCount; i++) {
          if (selected.has(flat)) {
            (byFile[f.id] ??= { file: f.file, indices: [] }).indices.push(i)
          }
          flat++
        }
      }
      const blobs: { blob: Blob; name: string }[] = []
      for (const { file: f, indices: idxs } of Object.values(byFile)) {
        const doc = await PDFDocument.load(await f.arrayBuffer())
        const newDoc = await PDFDocument.create()
        const pages = await newDoc.copyPages(doc, idxs)
        pages.forEach((p) => newDoc.addPage(p))
        blobs.push({ blob: new Blob([await newDoc.save()], { type: 'application/pdf' }), name: `extracted-${f.name}` })
      }
      triggerDownloadOverlay('Pages extracted!', () => {
        blobs.forEach(({ blob, name }) => downloadBlob(blob, name))
      })
    } catch {
      toast.error('Failed to extract pages')
    } finally {
      setProcessing(false)
    }
  }

  const handleMerge = async () => {
    if (selected.size === 0) { toast.error('Select at least one page'); return }
    setProcessing(true)
    try {
      const finalSource = files.map((f) => ({ file: f.file, pageIndices: [] as number[] }))
      let flatIdx = 0
      for (let fi = 0; fi < files.length; fi++) {
        for (let pi = 0; pi < files[fi].pageCount; pi++) {
          if (selected.has(flatIdx)) finalSource[fi].pageIndices.push(pi)
          flatIdx++
        }
      }
      const result = await mergePdfs(finalSource.filter((s) => s.pageIndices.length > 0))
      const blob = new Blob([result], { type: 'application/pdf' })
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
      <ToolHeader title="Merge PDF" description="Combine multiple PDF files into one document online — free & private." />
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
    </ToolPageWrapper>
  )
}
