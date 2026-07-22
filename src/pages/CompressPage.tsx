import { useState, useCallback } from 'react'
import { Loader2, Download } from 'lucide-react'
import { toast } from 'sonner'
import ToolHeader from '../components/ui/ToolHeader'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import { compressPdf, getPageCount } from '../lib/pdf'
import { formatFileSize } from '../lib/utils'

type Level = 'lossless' | 'balanced' | 'aggressive'

const levelInfo: Record<Level, { label: string; desc: string }> = {
  lossless: { label: 'Lossless', desc: 'Removes unused objects — text stays text, no quality loss' },
  balanced: { label: 'Balanced', desc: 'Lossless + compresses embedded images at 72 DPI' },
  aggressive: { label: 'Aggressive', desc: 'Lossless + compresses embedded images at 36 DPI' },
}

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [level, setLevel] = useState<Level>('lossless')
  const [processing, setProcessing] = useState(false)

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    const total = await getPageCount(f)
    setPageCount(total)
    toast.success(`Loaded ${total} pages`)
  }, [])

  const handleCompress = async () => {
    if (!file) return
    setProcessing(true)
    try {
      const before = file.size
      const result = await compressPdf(file, level)
      const blob = new Blob([result], { type: 'application/pdf' })
      const saved = ((before - blob.size) / before * 100).toFixed(1)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `compressed-${file.name}`; a.click()
      URL.revokeObjectURL(url)
      toast.success(`Compressed! Reduced by ${saved}%`)
    } catch {
      toast.error('Compression failed')
    } finally {
      setProcessing(false)
    }
  }

  if (!file) {
    return (
      <div>
        <ToolHeader title="Compress PDF" description="Reduce PDF file size online — lossless compression, text stays selectable." />
        <FileUpload onFiles={handleFile} multiple={false} />
      </div>
    )
  }

  return (
    <div>
      <ToolHeader title="Compress PDF" description="All modes keep text selectable and searchable — free online PDF compression." />
      <div className="section-card p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.name}</p>
          <p className="text-xs text-gray-400">{formatFileSize(file.size)} · {pageCount} pages</p>
        </div>
        <button onClick={() => { setFile(null); setPageCount(0) }} className="btn-ghost">Change file</button>
      </div>

      <div className="section-card p-5 mb-6 space-y-2.5">
        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">Compression level</label>
        {(Object.entries(levelInfo) as [Level, typeof levelInfo[Level]][]).map(([key, info]) => (
          <button key={key} onClick={() => setLevel(key)}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
              level === key
                ? 'border-jade bg-jade/5 dark:bg-jade-dark/10'
                : 'border-gray-200 dark:border-gray-700 hover:border-jade/30'
            }`}>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{info.label}</span>
            <p className="text-xs text-gray-400 mt-0.5">{info.desc}</p>
          </button>
        ))}
      </div>

      <div className="sticky bottom-4 sticky-bar p-4 flex items-center justify-between">
        <span className="text-sm text-gray-400">{pageCount} pages</span>
        <button onClick={handleCompress} disabled={processing} className="btn-primary flex items-center gap-2">
          {processing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {processing ? 'Compressing...' : 'Compress & Download'}
        </button>
      </div>
      {processing && <ProcessingOverlay message="Compressing PDF..." />}
    </div>
  )
}
