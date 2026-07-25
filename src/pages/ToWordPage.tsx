import { useState, useCallback } from 'react'
import { Loader2, Download, FileText, FileImage } from 'lucide-react'
import { toast } from 'sonner'
import ToolHeader from '../components/ui/ToolHeader'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import { classifyPdf, pdfToWord, getPageCount } from '../lib/pdf'
import { formatFileSize, downloadBlob, triggerDownloadOverlay } from '../lib/utils'
import usePageTitle from '../hooks/usePageTitle'

export default function ToWordPage() {
  usePageTitle('/to-word')
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [status, setStatus] = useState<'classifying' | 'converting' | null>(null)

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    const total = await getPageCount(f)
    setPageCount(total)
    toast.success(`Loaded ${total} pages`)
  }, [])

  const handleConvert = async () => {
    if (!file) return
    setProcessing(true)
    setStatus('classifying')
    setProgress('Analyzing PDF type...')

    try {
      const pdfType = await classifyPdf(file)
      setStatus('converting')

      if (pdfType === 'scanned') {
        setProgress('Scanned PDF detected — running OCR on each page...')
      } else if (pdfType === 'mixed') {
        setProgress('Mixed content detected — extracting text + OCR where needed...')
      } else {
        setProgress('Text-based PDF detected — extracting text directly...')
      }

      const blob = await pdfToWord(file, (current, total, statusText) => {
        setProgress(statusText)
      })

      triggerDownloadOverlay('Converted! PDF to Word', () => {
        downloadBlob(blob, `${file.name.replace(/\.pdf$/i, '')}.doc`)
      })
    } catch (err) {
      toast.error('Conversion failed')
      console.error(err)
    } finally {
      setProcessing(false)
      setStatus(null)
      setProgress('')
    }
  }

  if (!file) {
    return (
      <ToolPageWrapper>
        <ToolHeader title="PDF to Word" description="Convert PDF to Word document — automatically detects text vs. scanned pages and uses OCR when needed." />
        <FileUpload onFiles={handleFile} multiple={false} />
      </ToolPageWrapper>
    )
  }

  return (
    <ToolPageWrapper>
      <ToolHeader title="PDF to Word" description="Convert PDF to Word — OCR applied automatically to scanned pages." />
      <div className="p-4 mb-5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
        <div className="flex items-center gap-3">
          <div className="bg-jade/10 dark:bg-jade-dark/20 rounded-lg p-2 text-jade"><FileText size={16} /></div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.name}</p>
            <p className="text-xs text-gray-400">{formatFileSize(file.size)} · {pageCount} pages</p>
          </div>
        </div>
        <button onClick={() => { setFile(null); setPageCount(0) }} className="btn-ghost">Change file</button>
      </div>

      {/* PDF type detection info */}
      {!processing && (
        <div className="p-5 mb-5 space-y-3" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Lab of PDF will automatically detect whether your PDF contains selectable text or is a scanned document.
            Text pages are extracted directly; scanned pages use <strong>OCR (Optical Character Recognition)</strong>
            in your browser — no files uploaded.
          </p>
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-jade/5 dark:bg-jade-dark/10">
            <FileImage size={16} className="text-jade shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">Note:</span> OCR processing runs entirely in your browser using Tesseract.js.
              For scanned PDFs, each page is rendered as an image then recognized — this may take some time depending on page count.
            </p>
          </div>
        </div>
      )}

      {/* Progress */}
      {processing && (
        <div className="p-5 mb-5" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
          <div className="flex items-center gap-3">
            <Loader2 size={18} className="text-jade animate-spin shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {status === 'classifying' ? 'Analyzing PDF...' : 'Converting...'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{progress}</p>
            </div>
          </div>
          {status === 'converting' && (
            <div className="mt-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-jade to-jade-light h-full rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          )}
        </div>
      )}

      <div className="sticky bottom-4 sticky-bar p-4 flex items-center justify-between">
        <span className="text-sm text-gray-400">{pageCount} pages</span>
        <button onClick={handleConvert} disabled={processing} className="btn-primary flex items-center gap-2">
          {processing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {processing ? 'Converting...' : 'Convert to Word'}
        </button>
      </div>
      {processing && <ProcessingOverlay message={progress || 'Processing...'} />}
    </ToolPageWrapper>
  )
}
