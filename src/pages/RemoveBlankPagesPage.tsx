import { useMemo, useRef, useState } from 'react'
import { Check, Download, FileCheck2, Loader2, RotateCcw, ScanSearch, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolHeader from '../components/ui/ToolHeader'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import usePageTitle from '../hooks/usePageTitle'
import { suggestedBlankPages } from '../lib/blankPageDetection'
import { analyzePdfPageForBlankness, arrangePdfPages, getPageCount, inspectPdfStructure, type PdfBlankPageAnalysis, type PdfStructureInspection } from '../lib/pdfLazy'
import { downloadBlob, formatFileSize, triggerDownloadOverlay } from '../lib/utils'

type Sensitivity = 'conservative' | 'balanced' | 'aggressive'

const sensitivityOptions: Record<Sensitivity, { label: string; threshold: number; note: string }> = {
  conservative: { label: 'Conservative', threshold: .02, note: 'Keep pages with even tiny marks.' },
  balanced: { label: 'Balanced', threshold: .08, note: 'Ignore scanner dust and page edges.' },
  aggressive: { label: 'Aggressive', threshold: .25, note: 'Also flag pages with very small marks.' },
}

const emptyStructure: PdfStructureInspection = { hasForm: false, hasDigitalSignature: false, hasBookmarks: false, hasAttachments: false, hasPageLabels: false }

export default function RemoveBlankPagesPage() {
  usePageTitle('/remove-blank-pages')
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [analyses, setAnalyses] = useState<PdfBlankPageAnalysis[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [sensitivity, setSensitivity] = useState<Sensitivity>('balanced')
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [structure, setStructure] = useState<PdfStructureInspection>(emptyStructure)
  const operationRef = useRef<AbortController | null>(null)

  const threshold = sensitivityOptions[sensitivity].threshold
  const suggested = useMemo(() => new Set(suggestedBlankPages(analyses, threshold)), [analyses, threshold])
  const scanComplete = pageCount > 0 && analyses.length === pageCount
  const keptPages = pageCount - selected.size

  const scan = async (source: File, total: number, startAt = 0, scanSensitivity: Sensitivity = sensitivity) => {
    operationRef.current?.abort()
    const controller = new AbortController()
    operationRef.current = controller
    setScanning(true)
    const collected = startAt ? analyses.slice(0, startAt) : []
    if (!startAt) { setAnalyses([]); setSelected(new Set()) }
    try {
      for (let pageNumber = startAt + 1; pageNumber <= total; pageNumber++) {
        setProgress(`Checking page ${pageNumber} of ${total}…`)
        const result = await analyzePdfPageForBlankness(source, pageNumber, controller.signal)
        collected.push(result)
        setAnalyses([...collected])
      }
      const blankPages = suggestedBlankPages(collected, sensitivityOptions[scanSensitivity].threshold)
      setSelected(new Set(blankPages))
      toast.success(blankPages.length ? `Found ${blankPages.length} likely blank ${blankPages.length === 1 ? 'page' : 'pages'}` : 'No blank pages detected')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') toast.info('Blank-page scan stopped')
      else toast.error('This PDF could not be scanned for blank pages')
    } finally {
      if (operationRef.current === controller) operationRef.current = null
      setScanning(false)
      setProgress('')
    }
  }

  const handleFiles = async (files: File[]) => {
    const source = files[0]
    if (!source) return
    try {
      const [count, inspection] = await Promise.all([getPageCount(source), inspectPdfStructure(source)])
      setFile(source); setPageCount(count); setStructure(inspection); setSensitivity('balanced')
      await scan(source, count, 0, 'balanced')
    } catch {
      toast.error('This PDF could not be opened')
    }
  }

  const changeSensitivity = (next: Sensitivity) => {
    setSensitivity(next)
    setSelected(new Set(suggestedBlankPages(analyses, sensitivityOptions[next].threshold)))
  }

  const togglePage = (pageNumber: number) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(pageNumber)) next.delete(pageNumber)
      else next.add(pageNumber)
      return next
    })
  }

  const reset = () => {
    operationRef.current?.abort()
    setFile(null); setPageCount(0); setAnalyses([]); setSelected(new Set()); setStructure(emptyStructure)
  }

  const download = async () => {
    if (!file || selected.size === 0) { toast.info('Select at least one blank page to remove'); return }
    if (keptPages < 1) { toast.error('Keep at least one page in the PDF'); return }
    const controller = new AbortController()
    operationRef.current = controller
    setProcessing(true)
    try {
      const plan = Array.from({ length: pageCount }, (_, pageIndex) => pageIndex)
        .filter((pageIndex) => !selected.has(pageIndex + 1))
        .map((pageIndex) => ({ pageIndex }))
      const bytes = await arrangePdfPages(file, plan, (current, total) => setProgress(`Keeping page ${current} of ${total}…`), controller.signal)
      const blob = new Blob([Uint8Array.from(bytes).buffer], { type: 'application/pdf' })
      triggerDownloadOverlay('Blank pages removed!', () => downloadBlob(blob, `without-blank-pages-${file.name}`), [
        `${selected.size} ${selected.size === 1 ? 'page' : 'pages'} removed`,
        `${keptPages} ${keptPages === 1 ? 'page' : 'pages'} kept`,
        'Your original PDF was not changed',
      ])
    } catch (error) {
      toast.error(error instanceof DOMException && error.name === 'AbortError' ? 'PDF creation cancelled' : 'The cleaned PDF could not be created')
    } finally {
      if (operationRef.current === controller) operationRef.current = null
      setProcessing(false); setProgress('')
    }
  }

  const structuralWarnings = [
    structure.hasDigitalSignature && 'Removing pages can invalidate a digital signature.',
    structure.hasForm && 'Check interactive form fields in the downloaded copy.',
    (structure.hasBookmarks || structure.hasAttachments || structure.hasPageLabels) && 'Bookmarks, attachments, or page labels may change when pages are rewritten.',
  ].filter(Boolean) as string[]

  if (!file) return <ToolPageWrapper><ToolHeader title="Remove Blank Pages from PDF" description="Automatically find empty scanned or digital pages, review every suggestion, and remove only the pages you approve." /><FileUpload onFiles={handleFiles} multiple={false} title="a PDF" note="Automatic visual scan · private browser processing · no upload" /></ToolPageWrapper>

  return <ToolPageWrapper>
    <ToolHeader title="Remove Blank Pages from PDF" description="Review the visual scan, click any page to keep or remove it, then download a cleaned copy." />
    <div className="blank-file-bar"><div><FileCheck2 /><span><strong>{file.name}</strong><small>{formatFileSize(file.size)} · {pageCount} pages</small></span></div><button className="btn-ghost" onClick={reset} disabled={scanning || processing}>Change file</button></div>
    {structuralWarnings.length > 0 && <div className="editor-danger-note">{structuralWarnings.join(' ')}</div>}

    <section className="blank-review-panel">
      <div className="blank-review-heading"><div><span>AUTOMATIC VISUAL CHECK</span><h2>{scanning ? `Scanning page ${analyses.length + 1} of ${pageCount}` : scanComplete ? `${suggested.size} likely blank ${suggested.size === 1 ? 'page' : 'pages'}` : `${analyses.length} of ${pageCount} pages checked`}</h2><p>Pages are suggested from visible ink coverage. You always make the final choice.</p></div><div className="blank-review-actions"><label>Sensitivity<select value={sensitivity} disabled={scanning || processing} onChange={(event) => changeSensitivity(event.target.value as Sensitivity)}>{Object.entries(sensitivityOptions).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}</select><small>{sensitivityOptions[sensitivity].note}</small></label>{scanning ? <button className="btn-secondary" onClick={() => operationRef.current?.abort()}>Stop scan</button> : !scanComplete && <button className="btn-primary" onClick={() => void scan(file, pageCount, analyses.length)}><ScanSearch />Scan remaining</button>}</div></div>
      <div className="compare-progress" role="progressbar" aria-label={`${analyses.length} of ${pageCount} pages checked`} aria-valuemin={0} aria-valuemax={pageCount} aria-valuenow={analyses.length}><span style={{ width: `${pageCount ? analyses.length / pageCount * 100 : 0}%` }} /></div>
      <div className="blank-review-summary"><div><strong>{selected.size}</strong><span>Selected to remove</span></div><div><strong>{keptPages}</strong><span>Pages kept</span></div><div><strong>{suggested.size}</strong><span>Automatic suggestions</span></div><button className="btn-ghost" disabled={scanning} onClick={() => setSelected(new Set(suggested))}><Sparkles />Use suggestions</button><button className="btn-ghost" disabled={scanning || selected.size === 0} onClick={() => setSelected(new Set())}><RotateCcw />Keep all</button></div>
    </section>

    <div className="blank-page-grid" aria-live="polite">
      {analyses.map((analysis) => {
        const remove = selected.has(analysis.pageNumber)
        const auto = suggested.has(analysis.pageNumber)
        return <button type="button" key={analysis.pageNumber} className={`blank-page-card ${remove ? 'is-remove' : ''}`} aria-pressed={remove} onClick={() => togglePage(analysis.pageNumber)} disabled={processing}>
          <span className="blank-page-preview"><img src={analysis.preview} alt={`PDF page ${analysis.pageNumber} preview`} />{remove ? <span className="blank-remove-mark"><Trash2 />Remove</span> : <span className="blank-keep-mark"><Check />Keep</span>}</span>
          <span className="blank-page-meta"><strong>Page {analysis.pageNumber}</strong><small>{analysis.inkPercent < .005 ? '<0.005' : analysis.inkPercent.toFixed(3)}% visible ink</small><em>{auto ? 'Suggested blank' : 'Content detected'}</em></span>
        </button>
      })}
      {scanning && <div className="blank-page-loading"><Loader2 className="animate-spin" /><span>Checking page {analyses.length + 1}</span></div>}
    </div>

    <div className="sticky bottom-4 sticky-bar p-4 flex items-center justify-between"><span className="text-sm text-gray-400">{selected.size ? `${selected.size} selected · ${keptPages} kept` : 'Click a page to mark it for removal'}</span><button className="btn-primary flex items-center gap-2" disabled={scanning || processing || selected.size === 0 || keptPages < 1} onClick={() => void download()}>{processing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}Remove & download</button></div>
    {processing && <ProcessingOverlay message={progress || 'Creating cleaned PDF…'} onCancel={() => operationRef.current?.abort()} />}

    <section className="tool-faq"><h2>Remove empty PDF pages safely</h2><div><article><h3>How are blank pages detected?</h3><p>The tool renders a small local preview, estimates the paper background, and measures grouped dark or coloured pixels. Isolated scanner dust and the outer page edge are ignored.</p></article><article><h3>Can it delete a page with faint content?</h3><p>Automatic detection can be wrong. Review every thumbnail and use Conservative sensitivity for faint pencil, stamps, page numbers, or light handwriting.</p></article><article><h3>Does the PDF leave my device?</h3><p>No. Detection, page previews, and the cleaned PDF are created in this browser. The original file is never changed.</p></article></div></section>
  </ToolPageWrapper>
}
