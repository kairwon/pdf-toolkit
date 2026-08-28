import { useState, useCallback } from 'react'
import { AlertTriangle, CheckCircle2, Download, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import ToolHeader from '../components/ui/ToolHeader'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import CompactPdfPreview from '../components/ui/CompactPdfPreview'
import { inspectWatermarks, removeWatermark, type WatermarkInspection } from '../lib/pdf'
import { formatFileSize, downloadBlob, triggerDownloadOverlay } from '../lib/utils'
import usePageTitle from '../hooks/usePageTitle'
import usePendingFiles from '../hooks/usePendingFiles'

export default function UnwatermarkPage() {
  usePageTitle('/unwatermark')
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [inspection, setInspection] = useState<WatermarkInspection | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const reset = useCallback(() => {
    setFile(null)
    setPageCount(0)
    setInspection(null)
    setSelected(new Set())
  }, [])

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setAnalyzing(true)
    try {
      const result = await inspectWatermarks(f)
      setInspection(result)
      setPageCount(result.pageCount)
      setSelected(new Set(result.candidates.filter((candidate) => candidate.recommended).map((candidate) => candidate.id)))
      toast.success(result.candidates.length > 0
        ? `Found ${result.candidates.length} removable annotation${result.candidates.length === 1 ? '' : 's'}`
        : 'PDF loaded — no removable watermark annotations found')
    } catch {
      reset()
      toast.error('We could not read this PDF')
    } finally {
      setAnalyzing(false)
    }
  }, [reset])
  usePendingFiles(handleFile)

  const handleRemove = async () => {
    if (!file || selected.size === 0) return
    setProcessing(true)
    try {
      const result = await removeWatermark(file, [...selected])
      if (result.removedCount === 0) {
        toast.error('No selected annotations were removed')
        return
      }
      const blob = new Blob([Uint8Array.from(result.bytes).buffer], { type: 'application/pdf' })
      triggerDownloadOverlay(`Removed ${result.removedCount} annotation${result.removedCount === 1 ? '' : 's'} from ${result.affectedPages.length} page${result.affectedPages.length === 1 ? '' : 's'}`, () => {
        downloadBlob(blob, `clean-${file.name}`)
      })
    } catch {
      toast.error('Failed to remove watermark')
    } finally {
      setProcessing(false)
    }
  }

  if (!file) {
    return (
      <ToolPageWrapper>
        <ToolHeader title="Remove Watermark Annotations" description="Inspect and remove supported Stamp and Watermark annotations without uploading your PDF. You choose every candidate before the file is changed." />
        <FileUpload onFiles={handleFile} multiple={false} />
      </ToolPageWrapper>
    )
  }

  return (
    <ToolPageWrapper>
      <ToolHeader title="Remove Watermark Annotations" description="Review supported annotation-layer candidates before removing them locally." />
      <div className="p-4 mb-5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.name}</p>
          <p className="text-xs text-gray-400">{formatFileSize(file.size)} · {pageCount} pages</p>
        </div>
        <button onClick={reset} className="btn-ghost">Change file</button>
      </div>
      <CompactPdfPreview file={file} pageCount={pageCount} title="PDF annotation preview" />

      <div className="p-5 mb-5 space-y-4" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
        {analyzing ? (
          <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Inspecting annotation layers…</div>
        ) : inspection?.candidates.length ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><Search size={16} className="text-jade" /><strong>{inspection.candidates.length} candidate{inspection.candidates.length === 1 ? '' : 's'} found</strong></div>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost" onClick={() => setSelected(new Set(inspection.candidates.filter((candidate) => candidate.recommended).map((candidate) => candidate.id)))}>Recommended</button>
                <button type="button" className="btn-ghost" onClick={() => setSelected(new Set(inspection.candidates.map((candidate) => candidate.id)))}>Select all</button>
                <button type="button" className="btn-ghost" onClick={() => setSelected(new Set())}>Clear</button>
              </div>
            </div>
            <div className="space-y-2">
              {inspection.candidates.map((candidate) => (
                <label key={candidate.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-200/80 dark:border-gray-700 cursor-pointer hover:border-jade/40">
                  <input type="checkbox" className="mt-1 accent-jade" checked={selected.has(candidate.id)} onChange={(event) => setSelected((current) => {
                    const next = new Set(current)
                    if (event.target.checked) next.add(candidate.id)
                    else next.delete(candidate.id)
                    return next
                  })} />
                  <span className="flex-1 min-w-0"><strong className="text-sm text-gray-700 dark:text-gray-200 block truncate">{candidate.label}</strong><small className="text-xs text-gray-400">Page {candidate.pageNumber} · {candidate.subtype} annotation{candidate.recommended ? ' · likely watermark' : ' · review before removing'}</small></span>
                </label>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-start gap-3 text-sm text-gray-500 dark:text-gray-400"><CheckCircle2 size={18} className="text-jade shrink-0 mt-0.5" /><p>No supported Stamp or Watermark annotations were found. The file was not changed. A visible watermark may be part of the page content or a scanned image.</p></div>
        )}
        {inspection?.hasDigitalSignature && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm"><AlertTriangle size={17} className="shrink-0 mt-0.5" /><span>This PDF appears to contain a digital signature. Any saved modification can invalidate that signature.</span></div>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500">Only candidates you select are removed. Page-content and scanned-image watermarks are not altered, and the tool never covers content with white rectangles.</p>
      </div>

      <div className="sticky bottom-4 sticky-bar p-4 flex items-center justify-between">
        <span className="text-sm text-gray-400">{pageCount} pages · {selected.size} selected</span>
        <button onClick={handleRemove} disabled={processing || analyzing || selected.size === 0} className="btn-primary flex items-center gap-2">
          {processing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {processing ? 'Processing...' : selected.size > 0 ? 'Remove selected & download' : 'Select a candidate'}
        </button>
      </div>
      {processing && <ProcessingOverlay message="Removing watermark..." />}

      {/* SEO content */}
      <section className="portal-seo-copy" style={{ marginTop: '24px' }}>
        <span>PRIVATE PDF ANNOTATION CLEANER</span>
        <h2>Inspect and remove supported PDF watermark annotations</h2>
        <p>Find Stamp and Watermark annotations, review each candidate, and remove only the items you select. Processing stays in your browser.</p>
        <div>
          <article><h3>What can this tool remove?</h3><p>It supports PDF Stamp and Watermark annotation objects. It does not claim to remove text, images, or marks that are part of the page content.</p></article>
          <article><h3>Will it remove approval stamps?</h3><p>Not automatically. Stamp annotations are shown as review candidates and you decide which ones to remove.</p></article>
          <article><h3>Is this PDF watermark remover safe?</h3><p>Yes. The file never leaves your browser. All processing is done locally with no server upload or data sharing.</p></article>
        </div>
      </section>
    </ToolPageWrapper>
  )
}
