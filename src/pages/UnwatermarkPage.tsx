import { useState, useCallback } from 'react'
import { Loader2, Download } from 'lucide-react'
import { toast } from 'sonner'
import ToolHeader from '../components/ui/ToolHeader'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import { removeWatermark, getPageCount } from '../lib/pdf'
import { formatFileSize, downloadBlob, triggerDownloadOverlay } from '../lib/utils'
import usePageTitle from '../hooks/usePageTitle'
import usePendingFiles from '../hooks/usePendingFiles'

export default function UnwatermarkPage() {
  usePageTitle('/unwatermark')
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [processing, setProcessing] = useState(false)

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    const total = await getPageCount(f)
    setPageCount(total)
    toast.success(`Loaded ${total} pages`)
  }, [])
  usePendingFiles(handleFile)

  const handleRemove = async () => {
    if (!file) return
    setProcessing(true)
    try {
      const result = await removeWatermark(file)
      const blob = new Blob([Uint8Array.from(result).buffer], { type: 'application/pdf' })
      triggerDownloadOverlay('Watermark removed!', () => {
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
        <ToolHeader title="Remove Watermark" description="Remove watermarks from PDF files online free without uploading — browser-based watermark remover. Removes annotation overlays and covers common watermark areas with white rectangles. No sign-up, no limits. Your files never leave your computer." />
        <FileUpload onFiles={handleFile} multiple={false} />
      </ToolPageWrapper>
    )
  }

  return (
    <ToolPageWrapper>
      <ToolHeader title="Remove Watermark" description="Strip overlay watermarks and cover common watermark regions — free online tool." />
      <div className="p-4 mb-5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.name}</p>
          <p className="text-xs text-gray-400">{formatFileSize(file.size)} · {pageCount} pages</p>
        </div>
        <button onClick={() => { setFile(null); setPageCount(0) }} className="btn-ghost">Change file</button>
      </div>

      <div className="p-5 mb-5" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
        <p className="text-sm text-gray-500 dark:text-gray-400">This will remove Stamp and Watermark annotations from the PDF. It does not cover content with rectangles or modify page content.</p>
        <ul className="text-sm text-gray-400 dark:text-gray-500 mt-2 space-y-1 list-disc list-inside">
          <li>Removes annotation-layer watermark objects (Stamp / Watermark subtype)</li>
        </ul>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">Limitation: Watermarks rendered as page content (burned-in text/images) cannot be removed without re-rendering, which would destroy text selectability. This tool only removes annotation-type watermarks.</p>
      </div>

      <div className="sticky bottom-4 sticky-bar p-4 flex items-center justify-between">
        <span className="text-sm text-gray-400">{pageCount} pages</span>
        <button onClick={handleRemove} disabled={processing} className="btn-primary flex items-center gap-2">
          {processing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {processing ? 'Processing...' : 'Remove & Download'}
        </button>
      </div>
      {processing && <ProcessingOverlay message="Removing watermark..." />}

      {/* SEO content */}
      <section className="portal-seo-copy" style={{ marginTop: '24px' }}>
        <span>FREE ONLINE PDF WATERMARK REMOVER</span>
        <h2>Remove watermark from PDF online free — annotation remover</h2>
        <p>Remove Stamp and Watermark annotations from PDF documents in your browser. The tool identifies annotation-type watermarks and removes them from every page without covering content with rectangles.</p>
        <div>
          <article><h3>How to remove watermark from PDF?</h3><p>Upload your PDF, and the tool automatically detects and removes Stamp and Watermark annotation objects. Download the cleaned PDF locally.</p></article>
          <article><h3>Will removing watermarks damage my PDF?</h3><p>No. Only annotation-layer watermark objects are removed. Page content is not modified. Burned-in content watermarks may remain since they cannot be removed without re-rendering.</p></article>
          <article><h3>Is this PDF watermark remover safe?</h3><p>Yes. The file never leaves your browser. All processing is done locally with no server upload or data sharing.</p></article>
        </div>
      </section>
    </ToolPageWrapper>
  )
}
