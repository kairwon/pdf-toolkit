import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Files, Loader2, ScanSearch, Square } from 'lucide-react'
import { toast } from 'sonner'
import FileUpload from '../components/ui/FileUpload'
import ToolHeader from '../components/ui/ToolHeader'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import usePageTitle from '../hooks/usePageTitle'
import { getPageCount } from '../lib/pdfLazy'
import { comparePdfPages, measurePdfPageDifference, type PdfPageComparison } from '../lib/pdfCompare'
import { createPdfComparisonCsv, summarizePdfComparison } from '../lib/pdfCompareReport'
import { downloadBlob } from '../lib/utils'

type Sensitivity = 'strict' | 'balanced' | 'sensitive'

const sensitivityOptions: Record<Sensitivity, { label: string; threshold: number }> = {
  strict: { label: 'Major changes', threshold: 90 },
  balanced: { label: 'Balanced', threshold: 54 },
  sensitive: { label: 'Small changes', threshold: 24 },
}

export default function ComparePdfPage() {
  usePageTitle('/compare-pdf')
  const [files, setFiles] = useState<File[]>([])
  const [counts, setCounts] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const [view, setView] = useState<'side' | 'difference'>('difference')
  const [sensitivity, setSensitivity] = useState<Sensitivity>('balanced')
  const [comparison, setComparison] = useState<PdfPageComparison | null>(null)
  const [scores, setScores] = useState<Array<number | null>>([])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const stopScanRef = useRef(false)

  const comparable = counts.length === 2 ? Math.min(...counts) : 0
  const threshold = sensitivityOptions[sensitivity].threshold
  const summary = useMemo(() => summarizePdfComparison(scores, counts[0] || 0, counts[1] || 0), [scores, counts])

  const handleFiles = async (next: File[]) => {
    const chosen = next.slice(0, 2)
    if (chosen.length < 2) {
      toast.info('Choose two PDF versions together')
      return
    }
    try {
      const nextCounts = await Promise.all(chosen.map(getPageCount))
      setFiles(chosen)
      setCounts(nextCounts)
      setScores(Array(Math.min(...nextCounts)).fill(null))
      setPage(1)
      setComparison(null)
    } catch {
      toast.error('One of the PDFs could not be opened')
    }
  }

  useEffect(() => {
    if (files.length !== 2 || page > comparable || scanning) return
    let active = true
    setLoading(true)
    setComparison(null)
    void comparePdfPages(files[0], files[1], page, threshold)
      .then((value) => {
        if (!active) return
        setComparison(value)
        setScores((current) => {
          const next = current.length === comparable ? [...current] : Array(comparable).fill(null)
          next[page - 1] = value.changedPercent
          return next
        })
      })
      .catch(() => toast.error('Could not compare this page'))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [files, page, comparable, scanning, threshold])

  const changeSensitivity = (next: Sensitivity) => {
    setSensitivity(next)
    setScores(Array(comparable).fill(null))
    setComparison(null)
  }

  const scanAllPages = async () => {
    if (files.length !== 2 || scanning) return
    stopScanRef.current = false
    setScanning(true)
    setLoading(false)
    const nextScores: Array<number | null> = Array(comparable).fill(null)
    try {
      for (let index = 0; index < comparable; index++) {
        if (stopScanRef.current) break
        nextScores[index] = await measurePdfPageDifference(files[0], files[1], index + 1, threshold)
        setScores([...nextScores])
      }
      if (stopScanRef.current) toast.info(`Scan stopped after ${nextScores.filter((score) => score !== null).length} pages`)
      else toast.success('Full-document comparison complete')
    } catch {
      toast.error('The full-document comparison could not be completed')
    } finally {
      setScanning(false)
    }
  }

  const nextChangedPage = () => {
    if (summary.changedPages.length === 0) return
    setPage(summary.changedPages.find((changedPage) => changedPage > page) || summary.changedPages[0])
  }

  const downloadReport = () => {
    const csv = createPdfComparisonCsv(files[0].name, files[1].name, counts[0], counts[1], scores)
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'pdf-comparison-report.csv')
  }

  const reset = () => {
    stopScanRef.current = true
    setFiles([])
    setCounts([])
    setScores([])
    setComparison(null)
  }

  if (files.length !== 2) {
    return <ToolPageWrapper><ToolHeader title="Compare Two PDF Versions" description="Find changed pages, inspect visual differences, and create a local comparison report without uploading either document." /><FileUpload onFiles={handleFiles} multiple /></ToolPageWrapper>
  }

  return <ToolPageWrapper>
    <ToolHeader title="Compare Two PDF Versions" description="Scan the whole document, jump between changed pages, or inspect either version side by side." />
    <div className="compare-summary">
      <div><strong>{files[0].name}</strong><span>{counts[0]} pages</span></div>
      <Files />
      <div><strong>{files[1].name}</strong><span>{counts[1]} pages</span></div>
      <button className="btn-ghost" onClick={reset} disabled={scanning}>Change files</button>
    </div>

    {counts[0] !== counts[1] && <div className="editor-danger-note">The documents have different page counts. {summary.onlyInFirst || summary.onlyInSecond} unmatched page{summary.onlyInFirst + summary.onlyInSecond === 1 ? '' : 's'} will be listed in the report.</div>}

    <section className="compare-document-scan">
      <div className="compare-scan-heading">
        <div><span>WHOLE DOCUMENT</span><h2>{summary.comparedPages === comparable ? 'Comparison complete' : 'Find every changed page'}</h2><p>{summary.comparedPages} of {comparable} matching pages checked locally</p></div>
        <div className="compare-scan-actions">
          <label>Detection<select value={sensitivity} disabled={scanning} onChange={(event) => changeSensitivity(event.target.value as Sensitivity)}>{Object.entries(sensitivityOptions).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}</select></label>
          {scanning
            ? <button className="btn-secondary" onClick={() => { stopScanRef.current = true }}><Square /> Stop scan</button>
            : <button className="btn-primary" onClick={() => void scanAllPages()}><ScanSearch /> {summary.comparedPages === comparable ? 'Scan all again' : 'Scan all pages'}</button>}
        </div>
      </div>
      <div className="compare-progress" role="progressbar" aria-label={`${summary.comparedPages} of ${comparable} pages scanned`} aria-valuemin={0} aria-valuemax={comparable} aria-valuenow={summary.comparedPages}><span style={{ width: `${comparable ? summary.comparedPages / comparable * 100 : 0}%` }} /></div>
      {summary.comparedPages > 0 && <div className="compare-scan-results">
        <div className="compare-result-stats"><span><strong>{summary.changedPages.length}</strong>Changed</span><span><strong>{summary.unchangedPages}</strong>No material change</span><span><strong>{summary.largestDifference.toFixed(2)}%</strong>Largest page difference</span></div>
        <div className="compare-result-actions"><button className="btn-ghost" disabled={summary.changedPages.length === 0} onClick={nextChangedPage}>Next changed page <ChevronRight /></button><button className="btn-ghost" onClick={downloadReport}><Download /> Download CSV report</button></div>
        {summary.changedPages.length > 0 && <div className="compare-changed-pages"><span>Changed pages</span><div>{summary.changedPages.slice(0, 100).map((changedPage) => <button key={changedPage} className={page === changedPage ? 'active' : ''} onClick={() => setPage(changedPage)}>{changedPage}</button>)}{summary.changedPages.length > 100 && <small>+{summary.changedPages.length - 100} more in the CSV report</small>}</div></div>}
      </div>}
    </section>

    <div className="compare-toolbar">
      <div><button className={view === 'side' ? 'active' : ''} onClick={() => setView('side')}>Side by side</button><button className={view === 'difference' ? 'active' : ''} onClick={() => setView('difference')}>Highlight differences</button></div>
      <div className="watermark-page-switcher"><button aria-label="Previous page" disabled={page === 1 || scanning} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></button><span>Page {page} of {comparable}</span><button aria-label="Next page" disabled={page === comparable || scanning} onClick={() => setPage((value) => value + 1)}><ChevronRight /></button></div>
    </div>
    <section className={`compare-canvas is-${view}`}>
      {loading || !comparison ? <Loader2 className="animate-spin" /> : view === 'side' ? <><figure><figcaption>Original A</figcaption><img src={comparison.left} alt={`First PDF page ${page}`} /></figure><figure><figcaption>Original B</figcaption><img src={comparison.right} alt={`Second PDF page ${page}`} /></figure></> : <figure><figcaption>{comparison.changedPercent < .01 ? 'No material pixel differences detected' : `${comparison.changedPercent.toFixed(2)}% of pixels differ on this page`}</figcaption><img src={comparison.difference} alt={`Highlighted differences on page ${page}`} /></figure>}
    </section>
    <p className="compare-note">Pixel comparison catches layout, image and text appearance changes. It does not determine the legal or semantic meaning of a revision.</p>
  </ToolPageWrapper>
}
