import { useState, useCallback } from 'react'
import { Loader2, Download } from 'lucide-react'
import { toast } from 'sonner'
import ToolHeader from '../components/ui/ToolHeader'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import { addWatermark, getPageCount } from '../lib/pdf'
import { formatFileSize, downloadBlob, triggerDownloadOverlay } from '../lib/utils'
import usePageTitle from '../hooks/usePageTitle'
import usePendingFiles from '../hooks/usePendingFiles'

export default function WatermarkPage() {
  usePageTitle('/watermark')
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [text, setText] = useState('CONFIDENTIAL')
  const [opacity, setOpacity] = useState(20)
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

  const handleAdd = async () => {
    if (!file || !text.trim()) return
    setProcessing(true)
    try {
      const result = await addWatermark(file, text.trim(), {
        opacity: opacity / 100,
        angle: -35,
        fontSize: 52,
      })
      const blob = new Blob([Uint8Array.from(result).buffer], { type: 'application/pdf' })
      triggerDownloadOverlay('Watermark added!', () => {
        downloadBlob(blob, `watermarked-${file.name}`)
      })
    } catch {
      toast.error('Failed to add watermark')
    } finally {
      setProcessing(false)
    }
  }

  if (!file) {
    return (
      <ToolPageWrapper>
        <ToolHeader title="Add Watermark" description="Add a text watermark to every page of your PDF online free — no upload needed, no sign-up. Browser-based processing with unlimited pages and no file size limits. Your files stay completely private." />
        <FileUpload onFiles={handleFile} multiple={false} />
      </ToolPageWrapper>
    )
  }

  return (
    <ToolPageWrapper>
      <ToolHeader title="Add Watermark" description="Add a text watermark to every PDF page — free online tool." />
      <div className="p-4 mb-5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.name}</p>
          <p className="text-xs text-gray-400">{formatFileSize(file.size)} · {pageCount} pages</p>
        </div>
        <button onClick={() => { setFile(null); setPageCount(0) }} className="btn-ghost">Change file</button>
      </div>

      <div className="p-5 mb-5 space-y-5" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1.5">Watermark text</label>
          <input type="text" value={text} onChange={(e) => setText(e.target.value)}
            className="w-full max-w-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 outline-none focus:border-jade transition-colors" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1.5">Opacity: {opacity}%</label>
          <input type="range" min={5} max={80} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-full max-w-xs accent-jade" />
        </div>
      </div>

      <div className="sticky bottom-4 sticky-bar p-4 flex items-center justify-between">
        <span className="text-sm text-gray-400">{pageCount} pages</span>
        <button onClick={handleAdd} disabled={processing || !text.trim()} className="btn-primary flex items-center gap-2">
          {processing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {processing ? 'Adding...' : 'Add Watermark & Download'}
        </button>
      </div>
      {processing && <ProcessingOverlay message="Adding watermark..." />}

      {/* SEO content */}
      <section className="portal-seo-copy" style={{ marginTop: '24px' }}>
        <span>FREE ONLINE PDF WATERMARK TOOL</span>
        <h2>Add watermark to PDF online free — private browser-based tool</h2>
        <p>Add custom text watermarks to your PDF documents entirely in your browser. Choose your text, adjust opacity, and the watermark is applied to every page — no upload, no sign-up.</p>
        <div>
          <article><h3>How to add watermark to PDF for free?</h3><p>Upload your PDF, type the watermark text (e.g. CONFIDENTIAL, DRAFT), adjust the opacity slider, and download the watermarked PDF. Processing is done locally.</p></article>
          <article><h3>Is it safe to add watermark to PDF online?</h3><p>Yes. Your PDF stays in your browser — it is never uploaded to any server. The watermark is applied locally using pdf-lib.</p></article>
          <article><h3>Can I add watermark without uploading?</h3><p>Yes. All processing runs client-side in your browser. Choose a file, customize the watermark, and download the result directly.</p></article>
        </div>
      </section>
    </ToolPageWrapper>
  )
}
