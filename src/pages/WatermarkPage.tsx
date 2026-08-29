import { useState, useCallback, useEffect } from 'react'
import { Loader2, Download } from 'lucide-react'
import { toast } from 'sonner'
import ToolHeader from '../components/ui/ToolHeader'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import WatermarkCanvas from '../components/ui/WatermarkCanvas'
import { addWatermark, getPageCount } from '../lib/pdfLazy'
import type { WatermarkAnchor } from '../lib/watermarkPlacement'
import { formatFileSize, downloadBlob, triggerDownloadOverlay } from '../lib/utils'
import usePageTitle from '../hooks/usePageTitle'
import usePendingFiles from '../hooks/usePendingFiles'

export default function WatermarkPage() {
  usePageTitle('/watermark')
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [text, setText] = useState('CONFIDENTIAL')
  const [opacity, setOpacity] = useState(20)
  const [mode, setMode] = useState<'text' | 'image'>('text')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [position, setPosition] = useState<'custom' | 'tile'>('custom')
  const [anchor, setAnchor] = useState<WatermarkAnchor>({ x: 0.5, y: 0.5 })
  const [widthRatio, setWidthRatio] = useState(0.35)
  const [angle, setAngle] = useState(-35)
  const [color, setColor] = useState('#64706a')
  const [pageRange, setPageRange] = useState('')
  const [processing, setProcessing] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    if (!imageFile) { setImagePreview(null); return }
    const preview = URL.createObjectURL(imageFile)
    setImagePreview(preview)
    return () => URL.revokeObjectURL(preview)
  }, [imageFile])

  const selectedPageIndices = () => {
    if (!pageRange.trim()) return undefined
    const result = new Set<number>()
    for (const token of pageRange.split(',')) {
      const match = token.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/)
      if (!match) throw new Error('Invalid page range')
      const start = Number(match[1])
      const end = Number(match[2] ?? match[1])
      if (start < 1 || end < start || end > pageCount) throw new Error('Invalid page range')
      for (let page = start; page <= end; page++) result.add(page - 1)
    }
    return [...result]
  }

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
    if (!file || (mode === 'text' ? !text.trim() : !imageFile)) return
    setProcessing(true)
    try {
      const hex = color.replace('#', '')
      const image = imageFile
        ? { bytes: await imageFile.arrayBuffer(), mimeType: imageFile.type as 'image/png' | 'image/jpeg' }
        : undefined
      const result = await addWatermark(file, text.trim(), {
        opacity: opacity / 100,
        angle,
        position,
        anchor,
        widthRatio,
        pageIndices: selectedPageIndices(),
        image,
        color: {
          r: parseInt(hex.slice(0, 2), 16) / 255,
          g: parseInt(hex.slice(2, 4), 16) / 255,
          b: parseInt(hex.slice(4, 6), 16) / 255,
        },
      })
      const blob = new Blob([Uint8Array.from(result).buffer], { type: 'application/pdf' })
      triggerDownloadOverlay('Watermark added!', () => {
        downloadBlob(blob, `watermarked-${file.name}`)
      })
    } catch (error) {
      const message = error instanceof Error && error.message === 'Invalid page range'
        ? `Use page numbers between 1 and ${pageCount}, for example 1-3,5`
        : error instanceof Error && /WinAnsi/.test(error.message)
          ? 'This font supports Latin text only. Use an image watermark for other writing systems.'
          : 'Failed to add watermark'
      toast.error(message)
    } finally {
      setProcessing(false)
    }
  }

  if (!file) {
    return (
      <ToolPageWrapper>
        <ToolHeader title="Add Watermark" description="Add a configurable text or image watermark to selected PDF pages. Processing stays on this device; practical capacity depends on your browser and memory." />
        <FileUpload onFiles={handleFile} multiple={false} />
      </ToolPageWrapper>
    )
  }

  return (
    <ToolPageWrapper>
      <ToolHeader title="Add Watermark" description="Drag a text or image watermark directly onto the PDF preview, resize it visually, then choose pages, angle, and opacity." />
      <div className="p-4 mb-5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.name}</p>
          <p className="text-xs text-gray-400">{formatFileSize(file.size)} · {pageCount} pages</p>
        </div>
        <button onClick={() => { setFile(null); setPageCount(0) }} className="btn-ghost">Change file</button>
      </div>

      <div className="p-5 mb-5 space-y-5" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
        <div className="flex gap-2">
          <button type="button" className={mode === 'text' ? 'btn-primary' : 'btn-ghost'} onClick={() => setMode('text')}>Text watermark</button>
          <button type="button" className={mode === 'image' ? 'btn-primary' : 'btn-ghost'} onClick={() => setMode('image')}>Image watermark</button>
        </div>
        {mode === 'text' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Watermark text
              <input type="text" value={text} onChange={(e) => setText(e.target.value)} className="mt-1.5 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 outline-none focus:border-jade" />
            </label>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Text color
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="mt-1.5 block w-full h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white" />
            </label>
          </div>
        ) : (
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block">PNG or JPEG watermark
            <input type="file" accept="image/png,image/jpeg" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} className="mt-1.5 block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-jade/10 file:px-3 file:py-2 file:text-jade" />
            {imageFile && <small className="block mt-1 text-gray-400">Selected: {imageFile.name}</small>}
          </label>
        )}
        <WatermarkCanvas
          file={file}
          pageCount={pageCount}
          mode={mode}
          text={text}
          imagePreview={imagePreview}
          color={color}
          opacity={opacity}
          angle={angle}
          widthRatio={widthRatio}
          anchor={anchor}
          tiled={position === 'tile'}
          disabled={processing}
          onAnchorChange={(next) => { setPosition('custom'); setAnchor(next) }}
          onWidthChange={setWidthRatio}
          onTiledChange={(tiled) => setPosition(tiled ? 'tile' : 'custom')}
        />
        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block">Pages <span className="font-normal text-gray-400">(blank = all)</span>
          <input value={pageRange} onChange={(event) => setPageRange(event.target.value)} placeholder="1-3,5" className="mt-1.5 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm text-gray-600 dark:text-gray-300">Opacity: {opacity}%<input type="range" min={5} max={90} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="block w-full mt-2 accent-jade" /></label>
          <label className="text-sm text-gray-600 dark:text-gray-300">Angle: {angle}°<input type="range" min={-90} max={90} value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="block w-full mt-2 accent-jade" /></label>
          <label className="text-sm text-gray-600 dark:text-gray-300">Watermark width: {Math.round(widthRatio * 100)}%<input type="range" min={8} max={90} value={Math.round(widthRatio * 100)} onChange={(e) => setWidthRatio(Number(e.target.value) / 100)} className="block w-full mt-2 accent-jade" /></label>
        </div>
      </div>

      <div className="sticky bottom-4 sticky-bar p-4 flex items-center justify-between">
        <span className="text-sm text-gray-400">{pageCount} pages</span>
        <button onClick={handleAdd} disabled={processing || (mode === 'text' ? !text.trim() : !imageFile)} className="btn-primary flex items-center gap-2">
          {processing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {processing ? 'Adding...' : 'Add Watermark & Download'}
        </button>
      </div>
      {processing && <ProcessingOverlay message="Adding watermark..." />}

      {/* SEO content */}
      <section className="portal-seo-copy" style={{ marginTop: '24px' }}>
        <span>FREE ONLINE PDF WATERMARK TOOL</span>
        <h2>Add watermark to PDF online free — private browser-based tool</h2>
        <p>Add custom text or image watermarks to selected PDF pages entirely in your browser. Drag the watermark on a real page preview, resize its frame, and adjust the page range, angle, color, and opacity before downloading.</p>
        <div>
          <article><h3>How to add watermark to PDF for free?</h3><p>Upload your PDF, type the watermark text, drag it to the exact position on the preview, resize it from the corner, and download. Processing is done locally.</p></article>
          <article><h3>Is it safe to add watermark to PDF online?</h3><p>Yes. Your PDF stays in your browser — it is never uploaded to any server. The watermark is applied locally using pdf-lib.</p></article>
          <article><h3>Can I add watermark without uploading?</h3><p>Yes. All processing runs client-side in your browser. Choose a file, customize the watermark, and download the result directly.</p></article>
        </div>
      </section>
    </ToolPageWrapper>
  )
}
