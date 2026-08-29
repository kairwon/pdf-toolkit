import { useCallback, useRef, useState } from 'react'
import { Download, FileText, Loader2, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolHeader from '../components/ui/ToolHeader'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import usePageTitle from '../hooks/usePageTitle'
import { renderWordDocument, renderedWordToPdf } from '../lib/wordToPdf'
import { downloadBlob, formatFileSize, triggerDownloadOverlay } from '../lib/utils'

export default function WordToPdfPage() {
  usePageTitle('/word-to-pdf')
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const loadFile = useCallback(async (files: File[]) => {
    const nextFile = files[0]
    if (!nextFile || !previewRef.current) return
    if (!nextFile.name.toLowerCase().endsWith('.docx')) {
      toast.error('Choose a .docx Word document')
      return
    }
    setFile(nextFile)
    setPageCount(0)
    setLoadingPreview(true)
    try {
      const pages = await renderWordDocument(nextFile, previewRef.current)
      if (pages === 0) throw new Error('No pages could be displayed')
      setPageCount(pages)
      toast.success(`Preview ready · ${pages} page${pages === 1 ? '' : 's'}`)
    } catch (error) {
      previewRef.current.replaceChildren()
      setFile(null)
      toast.error(error instanceof Error ? error.message : 'This Word document could not be opened')
    } finally {
      setLoadingPreview(false)
    }
  }, [])

  const reset = () => {
    if (processing) return
    previewRef.current?.replaceChildren()
    setFile(null)
    setPageCount(0)
  }

  const convert = async () => {
    if (!file || !previewRef.current || pageCount === 0) return
    const controller = new AbortController()
    abortRef.current = controller
    setProcessing(true)
    try {
      const bytes = await renderedWordToPdf(previewRef.current, (_current, _total, message) => setProgress(message), controller.signal)
      const blob = new Blob([Uint8Array.from(bytes).buffer], { type: 'application/pdf' })
      triggerDownloadOverlay('Word document converted to PDF', () => downloadBlob(blob, `${file.name.replace(/\.docx$/i, '')}.pdf`), [
        `${pageCount} page${pageCount === 1 ? '' : 's'}`,
        'Created locally on this device',
      ])
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') toast.success('Conversion cancelled')
      else toast.error(error instanceof Error ? error.message : 'Could not create the PDF')
    } finally {
      setProcessing(false)
      setProgress('')
      abortRef.current = null
    }
  }

  return (
    <ToolPageWrapper>
      <ToolHeader title="Word to PDF" description="Preview and convert a .docx document to PDF in your browser. The document stays on this device, and the converter loads only when you use it." />

      {!file && <FileUpload onFiles={loadFile} multiple={false} accept={{ 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] }} title="Word document" note="DOCX · processed on this device · no account required" />}

      <div className={`word-pdf-workspace ${file ? 'has-document' : ''}`} hidden={!file && !loadingPreview}>
        <section className="word-pdf-preview-card" aria-label="Word document preview">
          <div className="word-pdf-preview-head"><div><strong>Document preview</strong><small>{loadingPreview ? 'Building preview…' : `${pageCount} page${pageCount === 1 ? '' : 's'} · scroll to inspect`}</small></div>{file && <button type="button" onClick={reset} disabled={processing}><RefreshCw /> Change</button>}</div>
          <div className="word-pdf-preview-viewport">
            {loadingPreview && <div className="word-pdf-preview-loading"><Loader2 className="animate-spin" /><span>Opening the Word document locally…</span></div>}
            <div className="word-pdf-preview-render" ref={previewRef} />
          </div>
        </section>

        <aside className="word-pdf-controls">
          <div className="word-pdf-file"><span><FileText /></span><div><strong>{file?.name}</strong><small>{file ? formatFileSize(file.size) : ''}</small></div></div>
          <div className="word-pdf-status"><ShieldCheck /><div><strong>No document upload</strong><p>Preview rendering and PDF creation run in browser memory on this device.</p></div></div>
          <div className="word-pdf-warning"><TriangleAlert /><div><strong>Review the preview before downloading</strong><p>Common paragraphs, images, tables, headers, and page breaks are supported. Complex fonts, tracked changes, SmartArt, and advanced Word layout can differ from Microsoft Word.</p></div></div>
          <button className="btn-primary word-pdf-convert" type="button" onClick={convert} disabled={processing || loadingPreview || pageCount === 0}>
            {processing ? <Loader2 className="animate-spin" /> : <Download />}{processing ? progress || 'Creating PDF…' : 'Convert & download PDF'}
          </button>
        </aside>
      </div>

      {processing && <ProcessingOverlay message={progress || 'Creating PDF…'} onCancel={() => abortRef.current?.abort()} />}

      <section className="portal-seo-copy" style={{ marginTop: 24 }}>
        <span>PRIVATE WORD TO PDF CONVERTER</span>
        <h2>Convert DOCX to PDF without uploading the document</h2>
        <p>Choose a modern Word .docx file, inspect the rendered pages, then create a PDF locally. The preview helps you catch layout differences before downloading.</p>
        <div><article><h3>Why does the PDF sometimes differ from Word?</h3><p>DOCX layout depends on Microsoft Word fonts and rendering rules. Browser conversion preserves common content but advanced layouts may differ, so always inspect the preview.</p></article><article><h3>Can I convert old .doc files?</h3><p>Not directly. Open the legacy .doc in Word or LibreOffice, save it as .docx, then use this private converter.</p></article><article><h3>Is the output searchable?</h3><p>The current privacy-first output preserves the visible page as a high-quality image. Use it when appearance matters; use a desktop office suite when selectable text or exact legal fidelity is required.</p></article></div>
      </section>
    </ToolPageWrapper>
  )
}
