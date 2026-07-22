import { useState, useCallback } from 'react'
import { Loader2, Download } from 'lucide-react'
import { toast } from 'sonner'
import ToolHeader from '../components/ui/ToolHeader'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import { addWatermark, getPageCount } from '../lib/pdf'
import { formatFileSize } from '../lib/utils'

export default function WatermarkPage() {
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

  const handleAdd = async () => {
    if (!file || !text.trim()) return
    setProcessing(true)
    try {
      const result = await addWatermark(file, text.trim(), {
        opacity: opacity / 100,
        angle: -35,
        fontSize: 52,
      })
      const blob = new Blob([result], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `watermarked-${file.name}`; a.click()
      URL.revokeObjectURL(url)
      toast.success('Watermark added')
    } catch {
      toast.error('Failed to add watermark')
    } finally {
      setProcessing(false)
    }
  }

  if (!file) {
    return (
      <div>
        <ToolHeader title="Add Watermark" description="Add a text watermark to every page of your PDF — free and private." />
        <FileUpload onFiles={handleFile} multiple={false} />
      </div>
    )
  }

  return (
    <div>
      <ToolHeader title="Add Watermark" description="Add a text watermark to every PDF page — free online tool." />
      <div className="section-card p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.name}</p>
          <p className="text-xs text-gray-400">{formatFileSize(file.size)} · {pageCount} pages</p>
        </div>
        <button onClick={() => { setFile(null); setPageCount(0) }} className="btn-ghost">Change file</button>
      </div>

      <div className="section-card p-5 mb-6 space-y-5">
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
    </div>
  )
}
