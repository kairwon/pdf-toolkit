import { useState, useCallback } from 'react'
import { Loader2, Download } from 'lucide-react'
import { toast } from 'sonner'
import ToolHeader from '../components/ui/ToolHeader'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import { removeWatermark, getPageCount } from '../lib/pdf'
import { formatFileSize } from '../lib/utils'

export default function UnwatermarkPage() {
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

  const handleRemove = async () => {
    if (!file) return
    setProcessing(true)
    try {
      const result = await removeWatermark(file)
      const blob = new Blob([result], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `clean-${file.name}`; a.click()
      URL.revokeObjectURL(url)
      toast.success('Watermark removal applied')
    } catch {
      toast.error('Failed to remove watermark')
    } finally {
      setProcessing(false)
    }
  }

  if (!file) {
    return (
      <ToolPageWrapper>
        <ToolHeader title="Remove Watermark" description="Strip overlay watermarks from PDF files online — free & browser-based." />
        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5 mb-5">
          ⚠ Watermarks embedded directly into page content cannot be fully removed. This tool works best on annotation-type watermarks and common edge / centre placements.
        </div>
        <FileUpload onFiles={handleFile} multiple={false} />
      </ToolPageWrapper>
    )
  }

  return (
    <ToolPageWrapper>
      <ToolHeader title="Remove Watermark" description="Strip overlay watermarks and cover common watermark regions — free online tool." />
      <div className="section-card p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.name}</p>
          <p className="text-xs text-gray-400">{formatFileSize(file.size)} · {pageCount} pages</p>
        </div>
        <button onClick={() => { setFile(null); setPageCount(0) }} className="btn-ghost">Change file</button>
      </div>

      <div className="section-card p-5 mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">This will attempt to remove watermarks by:</p>
        <ul className="text-sm text-gray-400 dark:text-gray-500 mt-2 space-y-1 list-disc list-inside">
          <li>Stripping annotation-layer overlays</li>
          <li>Covering corner and centre regions with white</li>
        </ul>
      </div>

      <div className="sticky bottom-4 sticky-bar p-4 flex items-center justify-between">
        <span className="text-sm text-gray-400">{pageCount} pages</span>
        <button onClick={handleRemove} disabled={processing} className="btn-primary flex items-center gap-2">
          {processing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {processing ? 'Processing...' : 'Remove & Download'}
        </button>
      </div>
      {processing && <ProcessingOverlay message="Removing watermark..." />}
    </ToolPageWrapper>
  )
}
