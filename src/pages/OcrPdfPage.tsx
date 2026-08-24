import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, FileSearch, Loader2, ScanText } from 'lucide-react'
import { toast } from 'sonner'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolHeader from '../components/ui/ToolHeader'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import usePageTitle from '../hooks/usePageTitle'
import usePendingFiles from '../hooks/usePendingFiles'
import { classifyPdf, cleanScannedPdf, DEFAULT_SCAN_CLEANUP, getPageCount, makePdfSearchable, renderPageToCanvas, type ScanCleanupOptions } from '../lib/pdf'
import { downloadBlob, formatFileSize, triggerDownloadOverlay } from '../lib/utils'

type Props = { mode?: 'ocr' | 'cleanup' }

export default function OcrPdfPage({ mode = 'ocr' }: Props) {
  const path = mode === 'cleanup' ? '/scan-cleanup' : '/ocr-pdf'
  usePageTitle(path)
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [preview, setPreview] = useState('')
  const [pdfType, setPdfType] = useState<'text' | 'mixed' | 'scanned' | null>(null)
  const [language, setLanguage] = useState('eng')
  const [cleanup, setCleanup] = useState<ScanCleanupOptions>(DEFAULT_SCAN_CLEANUP)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const handleFile = useCallback(async (files: File[]) => {
    const next = files[0]
    if (!next) return
    try {
      setPdfType(null)
      const total = await getPageCount(next)
      setFile(next)
      setPageCount(total)
      setPageNumber(1)
      void classifyPdf(next).then(setPdfType).catch(() => setPdfType(null))
    } catch {
      toast.error('This PDF could not be opened')
    }
  }, [])
  usePendingFiles(handleFile)

  useEffect(() => {
    if (!file) return
    let active = true
    void renderPageToCanvas(file, pageNumber, 1.15, 'jpeg', 0.88).then((value) => { if (active) setPreview(value) })
    return () => { active = false }
  }, [file, pageNumber])

  const run = async (action: 'ocr' | 'cleanup') => {
    if (!file) return
    const controller = new AbortController()
    abortRef.current = controller
    setProcessing(true)
    try {
      const bytes = action === 'ocr'
        ? await makePdfSearchable(file, language, cleanup, (_current, _total, message) => setProgress(message), controller.signal)
        : await cleanScannedPdf(file, cleanup, (_current, _total, message) => setProgress(message), controller.signal)
      const blob = new Blob([Uint8Array.from(bytes).buffer], { type: 'application/pdf' })
      triggerDownloadOverlay(action === 'ocr' ? 'Searchable PDF ready!' : 'Cleaned scan ready!', () => downloadBlob(blob, `${action === 'ocr' ? 'searchable' : 'cleaned'}-${file.name}`))
    } catch (error) {
      toast.error(error instanceof DOMException && error.name === 'AbortError' ? 'Processing cancelled' : 'The scan could not be processed')
    } finally {
      abortRef.current = null
      setProcessing(false)
      setProgress('')
    }
  }

  if (!file) return <ToolPageWrapper><ToolHeader title={mode === 'cleanup' ? 'Clean Scanned PDF' : 'Make PDF Searchable with OCR'} description="Improve scanned pages and add searchable text locally in your browser. No document upload." /><FileUpload onFiles={handleFile} multiple={false} /></ToolPageWrapper>

  const previewFilter = `grayscale(${cleanup.grayscale ? 1 : 0}) contrast(${100 + cleanup.contrast}%) brightness(${100 + cleanup.removeBackground * 0.7}%)`
  return (
    <ToolPageWrapper>
      <ToolHeader title={mode === 'cleanup' ? 'Clean Scanned PDF' : 'Make PDF Searchable with OCR'} description="Preview cleanup, preserve existing text pages, and run OCR only where scanned pages need it." />
      <div className="editor-file-bar"><div><strong>{file.name}</strong><span>{formatFileSize(file.size)} · {pageCount} pages · {pdfType ? `${pdfType} document` : 'analyzing text…'}</span></div><button className="btn-ghost" onClick={() => setFile(null)}>Change file</button></div>
      <div className="scan-workspace">
        <section className="scan-preview-card">
          <header><div><span>SCAN PREVIEW</span><h2>Inspect the cleaned page before export</h2></div><div className="watermark-page-switcher"><button aria-label="Previous page" disabled={pageNumber === 1} onClick={() => setPageNumber((value) => value - 1)}><ChevronLeft /></button><span>Page {pageNumber} of {pageCount}</span><button aria-label="Next page" disabled={pageNumber === pageCount} onClick={() => setPageNumber((value) => value + 1)}><ChevronRight /></button></div></header>
          <div className="scan-preview-surface">{preview ? <img src={preview} alt={`Cleaned preview of page ${pageNumber}`} style={{ filter: previewFilter, transform: `rotate(${cleanup.deskewDegrees}deg) scale(1.02)` }} /> : <Loader2 className="animate-spin" />}</div>
          <small>The preview approximates the local pixel cleanup. Always inspect handwriting, stamps, signatures and small print in the downloaded PDF.</small>
        </section>
        <aside className="scan-controls">
          <section><h3><FileSearch size={16} /> Document analysis</h3><p>{pdfType === 'text' ? 'This PDF already has searchable text. OCR will preserve those pages unchanged.' : pdfType === 'mixed' ? 'Text pages will be preserved; scanned pages will receive OCR.' : pdfType === 'scanned' ? 'Scanned pages detected. OCR can add an invisible searchable text layer.' : 'Checking whether pages contain selectable text…'}</p></section>
          <section><h3>Visual cleanup</h3><label className="editor-check"><input type="checkbox" checked={cleanup.grayscale} onChange={(event) => setCleanup({ ...cleanup, grayscale: event.target.checked })} />Convert to grayscale</label><label>Straighten: {cleanup.deskewDegrees.toFixed(1)}°<input type="range" min={-5} max={5} step={.25} value={cleanup.deskewDegrees} onChange={(event) => setCleanup({ ...cleanup, deskewDegrees: Number(event.target.value) })} /></label><label>Contrast: {cleanup.contrast}<input type="range" min={0} max={80} value={cleanup.contrast} onChange={(event) => setCleanup({ ...cleanup, contrast: Number(event.target.value) })} /></label><label>Remove light background: {cleanup.removeBackground}<input type="range" min={0} max={35} value={cleanup.removeBackground} onChange={(event) => setCleanup({ ...cleanup, removeBackground: Number(event.target.value) })} /></label><label>Output clarity<select value={cleanup.renderScale} onChange={(event) => setCleanup({ ...cleanup, renderScale: Number(event.target.value) })}><option value={1.35}>Smaller file</option><option value={1.8}>Balanced</option><option value={2.4}>Sharper text</option></select></label></section>
          {mode === 'ocr' && <section><h3><ScanText size={16} /> OCR language</h3><select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="eng">English</option><option value="chi_sim">Chinese (Simplified)</option><option value="chi_tra">Chinese (Traditional)</option><option value="deu">German</option><option value="fra">French</option><option value="spa">Spanish</option><option value="por">Portuguese</option><option value="ara">Arabic</option></select><p>OCR can contain mistakes. Verify names, numbers, equations and official identifiers before relying on the result.</p></section>}
        </aside>
      </div>
      <div className="sticky bottom-4 sticky-bar p-4 flex items-center justify-between gap-3"><span className="text-sm text-gray-400">Local processing · cancel between pages</span><div className="flex gap-2">{mode === 'ocr' && <button className="btn-ghost" disabled={processing} onClick={() => void run('cleanup')}>Clean scan only</button>}<button className="btn-primary flex items-center gap-2" disabled={processing} onClick={() => void run(mode === 'cleanup' ? 'cleanup' : 'ocr')}>{processing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}{processing ? 'Processing…' : mode === 'cleanup' ? 'Clean & download' : 'Make searchable & download'}</button></div></div>
      {processing && <ProcessingOverlay message={progress || 'Preparing pages…'} onCancel={() => abortRef.current?.abort()} />}
    </ToolPageWrapper>
  )
}
