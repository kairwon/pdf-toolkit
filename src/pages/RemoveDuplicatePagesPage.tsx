import { useMemo, useRef, useState } from 'react'
import { Check, CopyCheck, Download, FileCheck2, Loader2, RotateCcw, ScanSearch, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolHeader from '../components/ui/ToolHeader'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import usePageTitle from '../hooks/usePageTitle'
import { findDuplicatePageGroups } from '../lib/duplicatePageDetection'
import { analyzePdfPageForDuplication, arrangePdfPages, getPageCount, inspectPdfStructure, type PdfDuplicatePageAnalysis, type PdfStructureInspection } from '../lib/pdfLazy'
import { downloadBlob, formatFileSize, triggerDownloadOverlay } from '../lib/utils'

type MatchMode = 'exact' | 'balanced' | 'similar'

const modes: Record<MatchMode, { label: string; threshold: number; note: string }> = {
  exact: { label: 'Exact-looking', threshold: 100, note: 'Only identical visual fingerprints.' },
  balanced: { label: 'Balanced', threshold: 97, note: 'Allows tiny rendering or compression differences.' },
  similar: { label: 'Similar', threshold: 93, note: 'Finds more candidates and needs closer review.' },
}

const emptyStructure: PdfStructureInspection = { hasForm: false, hasDigitalSignature: false, hasBookmarks: false, hasAttachments: false, hasPageLabels: false }

export default function RemoveDuplicatePagesPage() {
  usePageTitle('/remove-duplicate-pages')
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [analyses, setAnalyses] = useState<PdfDuplicatePageAnalysis[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [mode, setMode] = useState<MatchMode>('balanced')
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [structure, setStructure] = useState<PdfStructureInspection>(emptyStructure)
  const operationRef = useRef<AbortController | null>(null)

  const groups = useMemo(() => findDuplicatePageGroups(analyses, modes[mode].threshold), [analyses, mode])
  const scanComplete = pageCount > 0 && analyses.length === pageCount
  const keptPages = pageCount - selected.size

  const suggestionsFor = (items: PdfDuplicatePageAnalysis[], nextMode: MatchMode) => {
    const matches = findDuplicatePageGroups(items, modes[nextMode].threshold)
    return new Set(matches.flatMap((group) => group.pageNumbers.slice(1)))
  }

  const scan = async (source: File, total: number, startAt = 0, scanMode: MatchMode = mode) => {
    operationRef.current?.abort()
    const controller = new AbortController()
    operationRef.current = controller
    setScanning(true)
    const collected = startAt ? analyses.slice(0, startAt) : []
    if (!startAt) { setAnalyses([]); setSelected(new Set()) }
    try {
      for (let pageNumber = startAt + 1; pageNumber <= total; pageNumber++) {
        setProgress(`Comparing page ${pageNumber} of ${total}…`)
        collected.push(await analyzePdfPageForDuplication(source, pageNumber, controller.signal))
        setAnalyses([...collected])
      }
      const nextSelected = suggestionsFor(collected, scanMode)
      setSelected(nextSelected)
      toast.success(nextSelected.size ? `Found ${nextSelected.size} likely duplicate ${nextSelected.size === 1 ? 'page' : 'pages'}` : 'No duplicate pages detected')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') toast.info('Duplicate-page scan stopped')
      else toast.error('This PDF could not be scanned for duplicate pages')
    } finally {
      if (operationRef.current === controller) operationRef.current = null
      setScanning(false); setProgress('')
    }
  }

  const handleFiles = async (files: File[]) => {
    const source = files[0]
    if (!source) return
    try {
      const [count, inspection] = await Promise.all([getPageCount(source), inspectPdfStructure(source)])
      setFile(source); setPageCount(count); setStructure(inspection); setMode('balanced')
      await scan(source, count, 0, 'balanced')
    } catch { toast.error('This PDF could not be opened') }
  }

  const changeMode = (next: MatchMode) => {
    setMode(next)
    setSelected(suggestionsFor(analyses, next))
  }

  const reset = () => {
    operationRef.current?.abort()
    setFile(null); setPageCount(0); setAnalyses([]); setSelected(new Set()); setStructure(emptyStructure)
  }

  const download = async () => {
    if (!file || selected.size === 0) { toast.info('Select at least one duplicate page to remove'); return }
    if (keptPages < 1) { toast.error('Keep at least one page in the PDF'); return }
    const controller = new AbortController()
    operationRef.current = controller
    setProcessing(true)
    try {
      const plan = Array.from({ length: pageCount }, (_, pageIndex) => pageIndex)
        .filter((pageIndex) => !selected.has(pageIndex + 1)).map((pageIndex) => ({ pageIndex }))
      const bytes = await arrangePdfPages(file, plan, (current, total) => setProgress(`Keeping page ${current} of ${total}…`), controller.signal)
      const blob = new Blob([Uint8Array.from(bytes).buffer], { type: 'application/pdf' })
      triggerDownloadOverlay('Duplicate pages removed!', () => downloadBlob(blob, `without-duplicates-${file.name}`), [
        `${selected.size} ${selected.size === 1 ? 'page' : 'pages'} removed`, `${keptPages} pages kept`, 'Your original PDF was not changed',
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

  if (!file) return <ToolPageWrapper><ToolHeader title="Find and Remove Duplicate PDF Pages" description="Scan a PDF for repeated pages, compare every visual match, and remove only the copies you approve." /><FileUpload onFiles={handleFiles} multiple={false} title="a PDF" note="Visual duplicate scan · private browser processing · no upload" /></ToolPageWrapper>

  return <ToolPageWrapper>
    <ToolHeader title="Find and Remove Duplicate PDF Pages" description="The first page in each matching group is kept by default. Review every thumbnail before downloading." />
    <div className="blank-file-bar"><div><FileCheck2 /><span><strong>{file.name}</strong><small>{formatFileSize(file.size)} · {pageCount} pages</small></span></div><button className="btn-ghost" onClick={reset} disabled={scanning || processing}>Change file</button></div>
    {structuralWarnings.length > 0 && <div className="editor-danger-note">{structuralWarnings.join(' ')}</div>}

    <section className="blank-review-panel">
      <div className="blank-review-heading"><div><span>LOCAL VISUAL MATCHING</span><h2>{scanning ? `Scanning page ${analyses.length + 1} of ${pageCount}` : scanComplete ? `${groups.length} matching ${groups.length === 1 ? 'group' : 'groups'} found` : `${analyses.length} of ${pageCount} pages checked`}</h2><p>Visual fingerprints find candidates even when the underlying PDF objects differ. You make every removal decision.</p></div><div className="blank-review-actions"><label>Match strength<select value={mode} disabled={scanning || processing} onChange={(event) => changeMode(event.target.value as MatchMode)}>{Object.entries(modes).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}</select><small>{modes[mode].note}</small></label>{scanning ? <button className="btn-secondary" onClick={() => operationRef.current?.abort()}>Stop scan</button> : !scanComplete && <button className="btn-primary" onClick={() => void scan(file, pageCount, analyses.length)}><ScanSearch />Scan remaining</button>}</div></div>
      <div className="compare-progress" role="progressbar" aria-label={`${analyses.length} of ${pageCount} pages checked`} aria-valuemin={0} aria-valuemax={pageCount} aria-valuenow={analyses.length}><span style={{ width: `${pageCount ? analyses.length / pageCount * 100 : 0}%` }} /></div>
      <div className="blank-review-summary"><div><strong>{selected.size}</strong><span>Copies selected</span></div><div><strong>{keptPages}</strong><span>Pages kept</span></div><div><strong>{groups.length}</strong><span>Matching groups</span></div><button className="btn-ghost" disabled={scanning} onClick={() => setSelected(suggestionsFor(analyses, mode))}><CopyCheck />Use suggestions</button><button className="btn-ghost" disabled={scanning || selected.size === 0} onClick={() => setSelected(new Set())}><RotateCcw />Keep all</button></div>
    </section>

    <div className="duplicate-groups" aria-live="polite">
      {!scanning && scanComplete && groups.length === 0 && <div className="duplicate-empty"><Check /><strong>No repeated pages found</strong><span>Try Similar matching if you expect copies with small visual differences.</span></div>}
      {groups.map((group, groupIndex) => <section className="duplicate-group" key={group.pageNumbers.join('-')}><header><div><span>MATCH {groupIndex + 1}</span><strong>{group.pageNumbers.length} similar pages</strong></div><small>{group.similarity.toFixed(1)}% visual match</small></header><div className="blank-page-grid">{group.pageNumbers.map((pageNumber, itemIndex) => {
        const analysis = analyses.find((item) => item.pageNumber === pageNumber)
        if (!analysis) return null
        const remove = selected.has(pageNumber)
        return <button type="button" key={pageNumber} className={`blank-page-card ${remove ? 'is-remove' : ''}`} aria-pressed={remove} onClick={() => setSelected((current) => { const next = new Set(current); if (next.has(pageNumber)) next.delete(pageNumber); else next.add(pageNumber); return next })} disabled={processing}>
          <span className="blank-page-preview"><img src={analysis.preview} alt={`PDF page ${pageNumber} preview`} />{remove ? <span className="blank-remove-mark"><Trash2 />Remove</span> : <span className="blank-keep-mark"><Check />Keep</span>}</span>
          <span className="blank-page-meta"><strong>Page {pageNumber}</strong><small>{itemIndex === 0 ? 'First occurrence' : 'Repeated candidate'}</small><em>{remove ? 'Selected for removal' : 'Kept in output'}</em></span>
        </button>
      })}</div></section>)}
      {scanning && <div className="blank-page-loading"><Loader2 className="animate-spin" /><span>{progress || `Checking page ${analyses.length + 1}`}</span></div>}
    </div>

    <div className="sticky bottom-4 sticky-bar p-4 flex items-center justify-between"><span className="text-sm text-gray-400">{selected.size ? `${selected.size} selected · ${keptPages} kept` : 'Review each matching group before removing copies'}</span><button className="btn-primary flex items-center gap-2" disabled={scanning || processing || selected.size === 0 || keptPages < 1} onClick={() => void download()}>{processing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}Remove & download</button></div>
    {processing && <ProcessingOverlay message={progress || 'Creating cleaned PDF…'} onCancel={() => operationRef.current?.abort()} />}

    <section className="tool-faq"><h2>Remove repeated PDF pages safely</h2><div><article><h3>What counts as a duplicate?</h3><p>The tool compares how pages look, not just internal PDF objects. Balanced matching tolerates tiny rendering differences while still requiring a very close visual match.</p></article><article><h3>Which copy is kept?</h3><p>The earliest page in each matching group is kept by default. Click any thumbnail to change the decision before creating the cleaned PDF.</p></article><article><h3>Are documents uploaded?</h3><p>No. Page rendering, matching, previews, and the cleaned PDF stay inside this browser tab.</p></article></div></section>
  </ToolPageWrapper>
}
