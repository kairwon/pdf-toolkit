import { useCallback, useRef, useState } from 'react'
import { CloudUpload, Download, FileOutput, FileText, Loader2, RefreshCw, Server, ShieldCheck } from 'lucide-react'
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
  const abortRef = useRef<AbortController | null>(null)

  const loadFile = useCallback((files: File[]) => {
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
    setOutput(null)
  }, [])

  const reset = () => {
    if (processing) return
    setFile(null)
    setOutput(null)
  }

  const convert = async () => {
    if (!file) return
    const controller = new AbortController()
    abortRef.current = controller
    setProcessing(true)
    setOutput(null)
    try {
      const response = await fetch('/api/word-to-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || (file.name.toLowerCase().endsWith('.docx')
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/msword'),
          'X-File-Name': encodeURIComponent(file.name),
        },
        body: file,
        signal: controller.signal,
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || `Conversion failed (${response.status})`)
      }
      const blob = await response.blob()
      if (blob.type !== 'application/pdf' || blob.size < 8) throw new Error('The converter did not return a valid PDF')
      const result = new File([blob], `${file.name.replace(/\.docx?$/i, '')}.pdf`, { type: 'application/pdf' })
      setOutput(result)
      toast.success('LibreOffice PDF ready · review the final pages below')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') toast.success('Conversion cancelled')
      else toast.error(error instanceof Error ? error.message : 'Could not convert this Word document')
    } finally {
      setProcessing(false)
      abortRef.current = null
    }
  }

  const download = () => {
    if (!output) return
    triggerDownloadOverlay('LibreOffice PDF ready', () => downloadBlob(output, output.name), [
      'Rendered by LibreOffice Writer',
      'Final PDF preview available',
    ])
  }

  return (
    <ToolPageWrapper>
      <ToolHeader title="Word to PDF" description="Convert DOC or DOCX with the LibreOffice Writer PDF export engine. Review the actual finished PDF before downloading." />

      {!file && <>
        <FileUpload
          onFiles={loadFile}
          multiple={false}
          accept={{ 'application/msword': ['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] }}
          title="Word document"
          note="DOC or DOCX · uploaded only after you start conversion · 25 MB maximum"
        />
        <div className="word-pdf-upload-disclosure"><CloudUpload /><div><strong>This tool requires a temporary document upload</strong><p>Unlike the local PDF tools, faithful Word layout needs a full office rendering engine. The document is sent over HTTPS to Lab of PDF, converted in an isolated temporary directory, and deleted immediately after the request succeeds or fails.</p></div></div>
      </>}

      {file && <>
        <div className="word-pdf-file-bar"><div><span><FileText /></span><div><strong>{file.name}</strong><small>{formatFileSize(file.size)} · {output ? 'LibreOffice conversion complete' : 'Ready to upload for conversion'}</small></div></div><button type="button" onClick={reset} disabled={processing}><RefreshCw /> Change file</button></div>
        <div className="word-pdf-workspace">
          {output
            ? <CompactPdfPreview file={output} title="Final LibreOffice PDF preview" />
            : <section className="word-pdf-awaiting" aria-label="Word conversion status"><span><FileOutput /></span><h2>No approximate browser preview</h2><p>Start the conversion to create the real LibreOffice-rendered PDF. The final PDF—not a browser imitation—will appear here for review.</p></section>}

          <aside className="word-pdf-controls">
            <div className="word-pdf-status"><Server /><div><strong>LibreOffice Writer rendering</strong><p>Uses the standard Writer PDF export filter for fonts, pagination, tables, headers, footers, and selectable text.</p></div></div>
            <div className="word-pdf-warning"><CloudUpload /><div><strong>Temporary server processing</strong><p>Your Word document is uploaded to this site's converter and removed immediately after conversion. It is not added to feedback, analytics, backups, or the public site.</p></div></div>
            <div className="word-pdf-status"><ShieldCheck /><div><strong>One conversion at a time</strong><p>Low concurrency, a 60-second limit, and a 25 MB cap protect the shared service from memory pressure.</p></div></div>
            {!output ? <button className="btn-primary word-pdf-convert" type="button" onClick={convert} disabled={processing}>
              {processing ? <Loader2 className="animate-spin" /> : <CloudUpload />}{processing ? 'LibreOffice is rendering…' : 'Upload & convert with LibreOffice'}
            </button> : <div className="word-pdf-result-actions"><button className="btn-primary" type="button" onClick={download}><Download /> Download PDF</button><button className="btn-ghost" type="button" onClick={convert}><RefreshCw /> Convert again</button></div>}
          </aside>
        </div>
      </>}

      {processing && <ProcessingOverlay message="LibreOffice is rendering the Word document…" onCancel={() => abortRef.current?.abort()} />}

      <section className="portal-seo-copy" style={{ marginTop: 24 }}>
        <span>LIBREOFFICE-POWERED WORD TO PDF</span>
        <h2>Use a real office engine, then preview the finished PDF</h2>
        <p>Lab of PDF sends the selected DOC or DOCX to an isolated LibreOffice Writer process, returns the generated PDF, and removes the temporary files. The finished PDF keeps selectable text where the source allows it.</p>
        <div><article><h3>Why is this more accurate than browser rendering?</h3><p>LibreOffice Writer understands Word document styles, sections, page breaks, headers, footers, tables, and embedded fonts more completely than an HTML preview.</p></article><article><h3>Is it identical to Microsoft Word?</h3><p>Not always. Proprietary fonts or Microsoft-only layout features can still differ, which is why the actual generated PDF is shown before download.</p></article><article><h3>Is the document uploaded?</h3><p>Yes, only for this tool. The page tells you before conversion. Temporary files are deleted after the conversion request and are not retained in product analytics or feedback.</p></article></div>
      </section>
    </ToolPageWrapper>
  )
}
