import { useState, useCallback } from 'react'
import { Loader2, Download, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import ToolHeader from '../components/ui/ToolHeader'
import FileUpload from '../components/ui/FileUpload'
import PdfViewer from '../components/ui/PdfViewer'
import type { PreviewItem } from '../components/ui/PdfViewer'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import { renderPageToCanvas, getPageCount } from '../lib/pdf'
import { downloadBlob, downloadZip, formatFileSize, triggerDownloadOverlay } from '../lib/utils'
import usePageTitle from '../hooks/usePageTitle'

export default function ToImagePage() {
  usePageTitle('/to-image')
  const [file, setFile] = useState<File | null>(null)
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [converting, setConverting] = useState(false)
  const [format, setFormat] = useState<'png' | 'jpg'>('png')
  const [scale, setScale] = useState(2)

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setLoading(true)
    try {
      const total = await getPageCount(f)
      const items = Array.from({ length: total }, (_, i) => ({
        index: i,
        file: f,
        label: f.name,
      }))
      setFile(f)
      setPreviewItems(items)
      setSelected(new Set(items.map((p) => p.index))) // Select all by default for convert
      toast.success(`Loaded ${total} pages`)
    } catch {
      toast.error('Failed to load PDF')
    } finally {
      setLoading(false)
    }
  }, [])

  const togglePage = useCallback((pageIndex: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(pageIndex)) next.delete(pageIndex)
      else next.add(pageIndex)
      return next
    })
  }, [])

  const handleConvert = async () => {
    if (!file || selected.size === 0) return
    setConverting(true)
    try {
      const indices = [...selected].sort((a, b) => a - b)
      const blobs = await Promise.all(
        indices.map(async (idx) => {
          const dataUrl = await renderPageToCanvas(file, idx + 1, scale)
          const blob = await fetch(dataUrl).then((r) => r.blob())
          return { blob, name: `page-${idx + 1}.${format}` }
        }),
      )
      triggerDownloadOverlay(`Converted! ${blobs.length} page${blobs.length !== 1 ? 's' : ''}`, () => {
        if (blobs.length === 1) downloadBlob(blobs[0].blob, blobs[0].name)
        else downloadZip(blobs, `${file.name.replace('.pdf', '')}-images.zip`)
      })
    } catch {
      toast.error('Conversion failed')
    } finally {
      setConverting(false)
    }
  }

  if (!file) {
    return (
      <ToolPageWrapper>
        <ToolHeader title="PDF to Image" description="Convert PDF pages to PNG or JPEG images online free without uploading — browser-based converter. No page limits, no file size limits, no sign-up. Download individually or as ZIP. Complete privacy — files never leave your device." />
        <FileUpload onFiles={handleFile} multiple={false} />
      </ToolPageWrapper>
    )
  }

  return (
    <ToolPageWrapper>
      <ToolHeader title="PDF to Image" description="Choose PNG or JPEG format and quality — free online PDF to image converter." />

      <div className="p-4 mb-5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
        <div className="flex items-center gap-3">
          <div className="bg-jade/10 dark:bg-jade-dark/20 rounded-lg p-2 text-jade"><ImageIcon size={16} /></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.name}</span>
          <span className="text-xs text-gray-400">{formatFileSize(file.size)} · {previewItems.length} pages</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <button onClick={() => setFormat('png')} className={`pill text-xs ${format === 'png' ? 'pill-active' : 'pill-inactive'}`}>PNG</button>
            <button onClick={() => setFormat('jpg')} className={`pill text-xs ${format === 'jpg' ? 'pill-active' : 'pill-inactive'}`}>JPEG</button>
          </div>
          <div className="flex gap-1.5">
            {[1, 1.5, 2, 3].map((s) => (
              <button key={s} onClick={() => setScale(s)} className={`pill text-xs ${scale === s ? 'pill-active' : 'pill-inactive'}`}>{s}×</button>
            ))}
          </div>
          <button onClick={() => { setFile(null); setPreviewItems([]) }} className="btn-ghost text-xs">Change file</button>
        </div>
      </div>

      <PdfViewer
        pages={previewItems}
        selected={selected}
        onToggle={togglePage}
        onSelectAll={() => setSelected(new Set(previewItems.map((p) => p.index)))}
        onDeselectAll={() => setSelected(new Set())}
      />

      <div className="mt-5 sticky-bar p-4 flex items-center justify-between">
        <span className="text-sm text-gray-400">{selected.size} page{selected.size !== 1 ? 's' : ''} · {format.toUpperCase()} · {scale}×</span>
        <button onClick={handleConvert} disabled={converting || selected.size === 0} className="btn-primary flex items-center gap-2">
          {converting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {converting ? 'Converting...' : selected.size === 1 ? 'Download Image' : 'Download ZIP'}
        </button>
      </div>
      {converting && <ProcessingOverlay message="Converting pages to images..." />}
    </ToolPageWrapper>
  )
}
