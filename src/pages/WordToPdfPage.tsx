import { useRef, useState } from 'react'
import { Download, Eye, FileText, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import CompactPdfPreview from '../components/ui/CompactPdfPreview'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolHeader from '../components/ui/ToolHeader'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import usePageTitle from '../hooks/usePageTitle'
import { downloadBlob, formatFileSize, triggerDownloadOverlay } from '../lib/utils'

const MAX_WORD_BYTES = 25 * 1024 * 1024

export default function WordToPdfPage() {
  usePageTitle('/word-to-pdf')
  const [file, setFile] = useState<File | null>(null)
  const [output, setOutput] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const reset = () => {
    if (processing) return
    setFile(null)
    setOutput(null)
    setError('')
  }

  const convert = async (sourceFile: File) => {
    const controller = new AbortController()
    abortRef.current = controller
    setProcessing(true)
    setOutput(null)
    setError('')
    try {
      const response = await fetch('/api/word-to-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': sourceFile.type || (sourceFile.name.toLowerCase().endsWith('.docx')
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/msword'),
          'X-File-Name': encodeURIComponent(sourceFile.name),
        },
        body: sourceFile,
        signal: controller.signal,
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || `Conversion failed (${response.status})`)
      }
      const blob = await response.blob()
      if (blob.type !== 'application/pdf' || blob.size < 8) throw new Error('The converter did not return a valid PDF')
      const result = new File([blob], `${sourceFile.name.replace(/\.docx?$/i, '')}.pdf`, { type: 'application/pdf' })
      setOutput(result)
      toast.success('Preview ready')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setError('Preview preparation was cancelled.')
        toast.success('Conversion cancelled')
      }
      else {
        const message = error instanceof Error ? error.message : 'Could not convert this Word document'
        setError(message)
        toast.error(message)
      }
    } finally {
      setProcessing(false)
      abortRef.current = null
    }
  }

  const loadFile = (files: File[]) => {
    const nextFile = files[0]
    if (!nextFile) return
    if (!/\.docx?$/i.test(nextFile.name)) {
      toast.error('Choose a .doc or .docx Word document')
      return
    }
    if (nextFile.size > MAX_WORD_BYTES) {
      toast.error('Word documents must be 25 MB or smaller')
      return
    }
    setFile(nextFile)
    void convert(nextFile)
  }

  const download = () => {
    if (!output) return
    triggerDownloadOverlay('Your PDF is ready', () => downloadBlob(output, output.name), [
      'Document layout preserved',
      'Preview checked before download',
    ])
  }

  return (
    <ToolPageWrapper>
      <ToolHeader title="Word to PDF" description="Choose a DOC or DOCX file and get an accurate PDF preview automatically." />

      {!file && <>
        <FileUpload
          onFiles={loadFile}
          multiple={false}
          accept={{ 'application/msword': ['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] }}
          title="Word document"
          note="DOC or DOCX · automatic preview · 25 MB maximum"
        />
      </>}

      {file && <>
        <div className="word-pdf-file-bar"><div><span><FileText /></span><div><strong>{file.name}</strong><small>{formatFileSize(file.size)} · {processing ? 'Preparing preview…' : output ? 'Preview ready' : 'Preview unavailable'}</small></div></div><button type="button" onClick={reset} disabled={processing}><RefreshCw /> Change file</button></div>
        <div className="word-pdf-workspace">
          {output
            ? <CompactPdfPreview file={output} title="PDF preview" />
            : <section className={`word-pdf-awaiting ${error ? 'has-error' : ''}`} aria-live="polite"><span>{processing ? <Loader2 className="animate-spin" /> : <Eye />}</span><h2>{processing ? 'Preparing your preview…' : 'Preview could not be created'}</h2><p>{processing ? 'Your document will appear here automatically.' : error}</p></section>}

          <aside className="word-pdf-controls">
            <h2>{processing ? 'Creating preview' : output ? 'Ready to download' : 'Try again'}</h2>
            <p>{processing ? 'The preview opens automatically when it is ready.' : output ? 'Check each page, then download your PDF.' : 'The document was not changed. Retry or choose another file.'}</p>
            {output
              ? <div className="word-pdf-result-actions"><button className="btn-primary" type="button" onClick={download}><Download /> Download PDF</button><button className="btn-ghost" type="button" onClick={() => void convert(file)}><RefreshCw /> Refresh preview</button></div>
              : <button className="btn-primary word-pdf-convert" type="button" onClick={() => void convert(file)} disabled={processing}>{processing ? <Loader2 className="animate-spin" /> : <RefreshCw />}{processing ? 'Preparing preview…' : 'Try again'}</button>}
          </aside>
        </div>
      </>}

      {processing && <ProcessingOverlay message="Preparing your PDF preview…" onCancel={() => abortRef.current?.abort()} />}

      <section className="portal-seo-copy" style={{ marginTop: 24 }}>
        <span>ACCURATE WORD TO PDF</span>
        <h2>Preview the finished PDF before downloading</h2>
        <p>Select a DOC or DOCX file and the finished PDF appears automatically. Review every page, then download when the layout looks right.</p>
        <div><article><h3>Does it preserve document layout?</h3><p>The converter supports styles, sections, page breaks, headers, footers, tables, images, and searchable text.</p></article><article><h3>Why should I check the preview?</h3><p>Documents that use uncommon fonts or advanced Microsoft-only features can still look slightly different, so the finished PDF is always shown first.</p></article><article><h3>Can I convert older Word files?</h3><p>Yes. Both modern DOCX documents and older DOC files are supported.</p></article></div>
      </section>
    </ToolPageWrapper>
  )
}
