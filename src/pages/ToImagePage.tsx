import { useState, useCallback, useEffect, useRef } from 'react'
import { Check, Download, Image as ImageIcon, Loader2, ScanSearch } from 'lucide-react'
import { toast } from 'sonner'
import ToolHeader from '../components/ui/ToolHeader'
import FileUpload from '../components/ui/FileUpload'
import PdfViewer from '../components/ui/PdfViewer'
import type { PreviewItem } from '../components/ui/PdfViewer'
import PageSelectionControls from '../components/ui/PageSelectionControls'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import { renderPageToCanvas, getPageCount } from '../lib/pdf'
import { downloadBlob, downloadZip, formatFileSize, triggerDownloadOverlay } from '../lib/utils'
import usePageTitle from '../hooks/usePageTitle'
import usePendingFiles from '../hooks/usePendingFiles'

export default function ToImagePage() {
  usePageTitle('/to-image')
  const [file, setFile] = useState<File | null>(null)
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [converting, setConverting] = useState(false)
  const [format, setFormat] = useState<'png' | 'jpg'>('png')
  const [scale, setScale] = useState(2)
  const [quality, setQuality] = useState(85)
  const [previewPageIndex, setPreviewPageIndex] = useState(0)
  const [outputPreview, setOutputPreview] = useState<{ url: string; width: number; height: number } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const operationAbort = useRef<AbortController | null>(null)

  useEffect(() => {
    if (selected.size === 0 || selected.has(previewPageIndex)) return
    let first = Number.POSITIVE_INFINITY
    selected.forEach((index) => { first = Math.min(first, index) })
    if (Number.isFinite(first)) setPreviewPageIndex(first)
  }, [previewPageIndex, selected])

  useEffect(() => {
    if (!file || previewItems.length === 0) return
    let active = true
    const timer = window.setTimeout(() => {
      setPreviewLoading(true)
      void renderPageToCanvas(file, previewPageIndex + 1, scale, format === 'png' ? 'png' : 'jpeg', quality / 100)
        .then(async (url) => {
          const image = new Image()
          image.src = url
          await image.decode()
          if (active) setOutputPreview({ url, width: image.naturalWidth, height: image.naturalHeight })
        })
        .catch(() => { if (active) setOutputPreview(null) })
        .finally(() => { if (active) setPreviewLoading(false) })
    }, 180)
    return () => { active = false; window.clearTimeout(timer) }
  }, [file, format, previewItems.length, previewPageIndex, quality, scale])

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
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
      setPreviewPageIndex(0)
      toast.success(`Loaded ${total} pages`)
    } catch {
      toast.error('Failed to load PDF')
    }
  }, [])
  usePendingFiles(handleFile)

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
    const controller = new AbortController()
    operationAbort.current = controller
    try {
      const indices = [...selected].sort((a, b) => a - b)
      const blobs: { blob: Blob; name: string }[] = []
      for (const [position, idx] of indices.entries()) {
        if (controller.signal.aborted) throw new DOMException('Operation cancelled', 'AbortError')
        setProgress(`Converting page ${position + 1} of ${indices.length}`)
        const dataUrl = await renderPageToCanvas(file, idx + 1, scale, format === 'png' ? 'png' : 'jpeg', quality / 100)
        const blob = await fetch(dataUrl).then((response) => response.blob())
        blobs.push({ blob, name: `page-${idx + 1}.${format}` })
      }
      triggerDownloadOverlay(`Converted! ${blobs.length} page${blobs.length !== 1 ? 's' : ''}`, () => {
        if (blobs.length === 1) downloadBlob(blobs[0].blob, blobs[0].name)
        else downloadZip(blobs, `${file.name.replace('.pdf', '')}-images.zip`)
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') toast.success('Conversion cancelled')
      else toast.error('Conversion failed')
    } finally {
      setConverting(false)
      setProgress('')
      operationAbort.current = null
    }
  }

  if (!file) {
    return (
      <ToolPageWrapper>
        <ToolHeader title="PDF to Image" description="Convert PDF pages to PNG or JPEG locally without uploading. Download individually or as ZIP; practical capacity depends on your browser and device memory." />
        <FileUpload onFiles={handleFile} multiple={false} />
      </ToolPageWrapper>
    )
  }

  return (
    <ToolPageWrapper>
      <ToolHeader title="PDF to Image" description="Preview the actual PNG or JPEG result while choosing clarity, file type, and pages." />

      <div className="p-4 mb-5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
        <div className="flex items-center gap-3">
          <div className="bg-jade/10 dark:bg-jade-dark/20 rounded-lg p-2 text-jade"><ImageIcon size={16} /></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.name}</span>
          <span className="text-xs text-gray-400">{formatFileSize(file.size)} · {previewItems.length} pages</span>
        </div>
        <button onClick={() => { setFile(null); setPreviewItems([]); setSelected(new Set()); setOutputPreview(null) }} className="btn-ghost text-xs">Change file</button>
      </div>

      <section className="image-export-workbench" aria-label="Image output preview and settings">
        <div className="image-export-controls">
          <div><strong>1. Choose the image type</strong><div className="image-export-format" role="radiogroup" aria-label="Image format">
            <button type="button" role="radio" aria-checked={format === 'png'} className={format === 'png' ? 'active' : ''} disabled={converting} onClick={() => setFormat('png')}><span>PNG</span><small>Sharp text and graphics · larger files</small>{format === 'png' && <Check />}</button>
            <button type="button" role="radio" aria-checked={format === 'jpg'} className={format === 'jpg' ? 'active' : ''} disabled={converting} onClick={() => setFormat('jpg')}><span>JPEG</span><small>Smaller files · best for scans and photos</small>{format === 'jpg' && <Check />}</button>
          </div></div>
          <div><strong>2. Choose the clarity</strong><div className="image-export-scale" role="radiogroup" aria-label="Image resolution">
            {[{ value: 1, label: 'Screen', detail: '1×' }, { value: 1.5, label: 'Balanced', detail: '1.5×' }, { value: 2, label: 'Sharp', detail: '2×' }, { value: 3, label: 'Print', detail: '3×' }].map((option) => <button type="button" role="radio" aria-checked={scale === option.value} className={scale === option.value ? 'active' : ''} disabled={converting} onClick={() => setScale(option.value)} key={option.value}><b>{option.label}</b><small>{option.detail}</small></button>)}
          </div></div>
          {format === 'jpg' && <div><strong>3. Balance detail and file size</strong><div className="image-export-quality-presets">
            {[{ value: 60, label: 'Smaller' }, { value: 85, label: 'Balanced' }, { value: 100, label: 'Maximum' }].map((option) => <button type="button" className={quality === option.value ? 'active' : ''} disabled={converting} onClick={() => setQuality(option.value)} key={option.value}>{option.label}</button>)}
          </div><label className="image-export-quality">JPEG quality <span>{quality}%</span><input aria-label="JPEG quality" type="range" min="40" max="100" value={quality} disabled={converting} onChange={(event) => setQuality(Number(event.target.value))} /></label></div>}
        </div>
        <div className="image-export-preview" aria-busy={previewLoading}>
          <div className="image-export-preview-head"><span><ScanSearch /> Output preview</span><small>Page {previewPageIndex + 1} · {format.toUpperCase()}</small></div>
          <div className="image-export-preview-stage">{outputPreview && <img src={outputPreview.url} alt={`Page ${previewPageIndex + 1} ${format.toUpperCase()} output preview`} />}{previewLoading && <span>Updating preview…</span>}</div>
          <p>{outputPreview ? `${outputPreview.width.toLocaleString()} × ${outputPreview.height.toLocaleString()} pixels` : 'Preparing the selected page'} · the downloaded image uses these settings</p>
        </div>
      </section>

      <PdfViewer
        pages={previewItems}
        selected={selected}
        onToggle={togglePage}
        onSelectAll={() => setSelected(new Set(previewItems.map((p) => p.index)))}
        onDeselectAll={() => setSelected(new Set())}
        onCurrentChange={setPreviewPageIndex}
      />

      <PageSelectionControls
        pageIds={previewItems.map((page) => page.index)}
        selected={selected}
        onChange={setSelected}
        disabled={converting}
      />

      <div className="mt-5 sticky-bar p-4 flex items-center justify-between">
        <span className="text-sm text-gray-400">{selected.size} page{selected.size !== 1 ? 's' : ''} · {format.toUpperCase()} · {scale}×</span>
        <button onClick={handleConvert} disabled={converting || selected.size === 0} className="btn-primary flex items-center gap-2">
          {converting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {converting ? 'Converting...' : selected.size === 1 ? 'Download Image' : 'Download ZIP'}
        </button>
      </div>
      {converting && <ProcessingOverlay message={progress || 'Converting pages to images...'} onCancel={() => operationAbort.current?.abort()} />}

      {/* SEO content */}
      <section className="portal-seo-copy" style={{ marginTop: '24px' }}>
        <span>FREE ONLINE PDF TO IMAGE CONVERTER</span>
        <h2>Convert PDF to PNG or JPEG images — browser-based PDF converter</h2>
        <p>Convert PDF pages to high-quality PNG or JPEG images in your browser. Choose resolution from 1x to 3x, select pages, and download individually or as a ZIP file without uploading the document.</p>
        <div>
          <article><h3>How to convert PDF to image for free?</h3><p>Upload a PDF, choose PNG or JPEG format, select the resolution (1x, 1.5x, 2x, or 3x), pick the pages to convert, and download as individual images or a ZIP archive.</p></article>
          <article><h3>Is PDF to image conversion safe?</h3><p>Yes. Conversion runs entirely in your browser using PDF.js rendering. Your PDF never leaves your device.</p></article>
          <article><h3>Can I convert PDF to image without uploading?</h3><p>Yes. All rendering happens client-side. Your file is processed in browser memory and never sent to any server.</p></article>
        </div>
      </section>
    </ToolPageWrapper>
  )
}
