import { useCallback, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowRight, BadgeCheck, CheckCircle2, Download, ExternalLink,
  FileCheck2, FileSearch, Gauge, Loader2, LockKeyhole, RotateCcw, ShieldCheck,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import { analyzePdfForSubmission, compressPdf, type SubmissionAnalysis } from '../lib/pdf'
import { downloadBlob, formatFileSize, triggerDownloadOverlay } from '../lib/utils'
import usePageTitle from '../hooks/usePageTitle'
import usePendingFiles from '../hooks/usePendingFiles'

type Level = 'lossless' | 'balanced' | 'aggressive'
type Preset = {
  id: string
  group: string
  label: string
  limitMb: number
  verified?: boolean
  source?: string
  detail: string
}

const presets: Preset[] = [
  { id: 'custom', group: 'Custom', label: 'My portal shows a different limit', limitMb: 5, detail: 'Enter the exact maximum displayed beside the upload field.' },
  { id: 'ircc-secure', group: 'Government & visa', label: 'Canada — IRCC secure account', limitMb: 4, verified: true, source: 'https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=1123&top=23', detail: 'Official IRCC maximum per file.' },
  { id: 'ircc-portal', group: 'Government & visa', label: 'Canada — IRCC Portal / new portal', limitMb: 5, verified: true, source: 'https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=1123&top=23', detail: 'Official IRCC maximum per file.' },
  { id: 'ceac', group: 'Government & visa', label: 'United States — NVC / CEAC immigrant visa', limitMb: 2, verified: true, source: 'https://travel.state.gov/content/travel/en/us-visas/immigrate/the-immigrant-visa-process/step-1-submit-a-petition/step-2-begin-nvc-processing/scanning-and-uploading-tips.html', detail: 'Official maximum per scanned document; 150 DPI is recommended.' },
  { id: 'nz-visitor', group: 'Government & visa', label: 'New Zealand — online Visitor Visa', limitMb: 10, verified: true, source: 'https://www.immigration.govt.nz/assets/inz/documents/forms-and-guides/visitor-visa-guide-english-final.pdf', detail: 'Official Visitor Visa guide maximum per supporting PDF.' },
  { id: 'uk-manual', group: 'Government & visa', label: 'United Kingdom visa — use portal limit', limitMb: 5, detail: 'UK applications use different commercial or government upload services. Verify the number shown in your session.' },
  { id: 'au-manual', group: 'Government & visa', label: 'Australia ImmiAccount — use portal limit', limitMb: 5, detail: 'Requirements can vary by form and document field. Verify the current ImmiAccount prompt.' },
  { id: 'schengen-manual', group: 'Government & visa', label: 'Schengen / VFS / TLS — use portal limit', limitMb: 5, detail: 'There is no single Schengen upload limit. Use the value shown by the country and provider.' },
  { id: 'university', group: 'Study & work', label: 'University submission portal', limitMb: 10, detail: 'Common starting target only—not an official universal rule. Replace it with your university limit.' },
  { id: 'job', group: 'Study & work', label: 'Job application / HR portal', limitMb: 5, detail: 'Practical starting target only. The employer portal remains authoritative.' },
  { id: 'email', group: 'Email & sharing', label: 'Email attachment', limitMb: 20, detail: 'Conservative attachment target; provider and message limits vary.' },
]

export default function PortalReadyPage() {
  usePageTitle('/portal-ready-pdf')
  const [presetId, setPresetId] = useState('custom')
  const [targetMb, setTargetMb] = useState(5)
  const [file, setFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<SubmissionAnalysis | null>(null)
  const [processing, setProcessing] = useState(false)
  const [resultSize, setResultSize] = useState<number | null>(null)

  const preset = presets.find((item) => item.id === presetId) || presets[0]
  const fileFits = !!file && file.size <= targetMb * 1024 * 1024
  const resultFits = resultSize !== null && resultSize <= targetMb * 1024 * 1024
  const grouped = useMemo(() => Array.from(new Set(presets.map((item) => item.group))), [])

  const choosePreset = (id: string) => {
    const next = presets.find((item) => item.id === id) || presets[0]
    setPresetId(next.id)
    setTargetMb(next.limitMb)
    setResultSize(null)
  }

  const handleFile = useCallback(async (files: File[]) => {
    const next = files[0]
    if (!next) return
    setFile(next)
    setResultSize(null)
    try {
      setAnalysis(await analyzePdfForSubmission(next))
      toast.success('PDF checked locally')
    } catch {
      setFile(null)
      setAnalysis(null)
      toast.error('We could not read this PDF')
    }
  }, [])
  usePendingFiles(handleFile)

  const prepare = async () => {
    if (!file) return
    setProcessing(true)
    try {
      const targetBytes = targetMb * 1024 * 1024
      const attempts: Level[] = file.size <= targetBytes
        ? ['lossless']
        : ['lossless', 'balanced', 'aggressive']
      let bytes = await compressPdf(file, attempts[0])
      for (const mode of attempts.slice(1)) {
        if (bytes.byteLength <= targetBytes) break
        const candidate = await compressPdf(file, mode)
        if (candidate.byteLength < bytes.byteLength) bytes = candidate
      }
      setResultSize(bytes.byteLength)
      const output = new Blob([Uint8Array.from(bytes).buffer], { type: 'application/pdf' })
      triggerDownloadOverlay(bytes.byteLength <= targetBytes ? `Ready — under ${targetMb}MB` : `Prepared — still above ${targetMb}MB`, () => {
        downloadBlob(output, `portal-ready-${file.name}`)
      })
      toast.success(bytes.byteLength <= targetBytes
        ? `Ready: output is under ${targetMb}MB`
        : `Output created, but it is still above ${targetMb}MB`)
    } catch {
      toast.error('This PDF could not be prepared')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="portal-workspace">
      <header className="portal-hero">
        <div>
          <span><Target size={14} /> PORTAL-READY PDF</span>
          <h1>Make a PDF fit the upload limit</h1>
          <p>Choose the portal, check the file, and create a smaller submission copy—entirely inside your browser.</p>
        </div>
        <div className="portal-trust"><LockKeyhole size={19} /><div><strong>No document upload</strong><small>PDF contents stay on this device</small></div></div>
      </header>

      <div className="portal-layout">
        <main>
          <section className="portal-card">
            <div className="portal-section-head"><span>01</span><div><strong>Choose the destination</strong><small>Official limits are labelled. Other presets are editable starting points.</small></div></div>
            <div className="portal-destination-grid">
              <label className="portal-select-label">Portal or use case
                <select value={presetId} onChange={(event) => choosePreset(event.target.value)}>
                  {grouped.map((group) => (
                    <optgroup label={group} key={group}>
                      {presets.filter((item) => item.group === group).map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="portal-limit-label">Maximum file size
                <div className="portal-target"><input type="number" min=".1" step=".1" value={targetMb} onChange={(event) => setTargetMb(Math.max(.1, Number(event.target.value)))} /><span>MB</span></div>
              </label>
            </div>
            <div className={`portal-rule ${preset.verified ? 'verified' : ''}`}>
              {preset.verified ? <BadgeCheck size={18} /> : <AlertTriangle size={18} />}
              <div><strong>{preset.verified ? `Verified official limit: ${preset.limitMb}MB` : 'Editable starting target'}</strong><span>{preset.detail}</span></div>
              {preset.source && <a href={preset.source} target="_blank" rel="noreferrer">Official source <ExternalLink size={12} /></a>}
            </div>
            <div className="portal-limit-help">
              <span>The portal fills this automatically. You can replace it with the exact limit shown on your upload page.</span>
              <button onClick={() => setTargetMb(preset.limitMb)}><RotateCcw size={12} /> Reset to preset</button>
            </div>
          </section>

          <section className="portal-card">
            <div className="portal-section-head"><span>02</span><div><strong>Add and inspect your PDF</strong><small>We check size, pages, text layer, page format, and orientation locally.</small></div></div>
            {!file ? <FileUpload onFiles={handleFile} multiple={false} /> : (
              <div className="portal-file">
                <div className="portal-file-icon"><FileSearch size={22} /></div>
                <div><strong>{file.name}</strong><small>{formatFileSize(file.size)} · {analysis?.pageCount || '—'} pages</small></div>
                <button onClick={() => { setFile(null); setAnalysis(null); setResultSize(null) }}>Change</button>
              </div>
            )}
            {file && analysis && (
              <div className="portal-check-grid">
                <div className={fileFits ? 'pass' : 'warn'}><Gauge size={16} /><span><strong>{fileFits ? 'Within current target' : 'Above current target'}</strong><small>{formatFileSize(file.size)} / {targetMb}MB</small></span></div>
                <div><FileCheck2 size={16} /><span><strong>{analysis.textStatus === 'searchable' ? 'Searchable text' : analysis.textStatus === 'mixed' ? 'Mixed text and scans' : 'Scanned PDF'}</strong><small>{analysis.pageFormat} · {analysis.landscapePages} landscape</small></span></div>
              </div>
            )}
          </section>

          {file && analysis && (
            <section className="portal-card portal-final-step">
              <div className="portal-section-head"><span>03</span><div><strong>Prepare and download</strong><small>We automatically use the highest quality that can meet your selected limit.</small></div></div>
              <div className="portal-final-grid">
                <div className="portal-auto-steps">
                  <div><span>1</span><p><strong>Preserve first</strong><small>Keep selectable text and original clarity when possible.</small></p></div>
                  <div><span>2</span><p><strong>Reduce only if needed</strong><small>Compress scanned pages progressively until the target is met.</small></p></div>
                  <div><span>3</span><p><strong>Verify the result</strong><small>Measure the final file and report honestly if it is still too large.</small></p></div>
                </div>
                <div className="portal-final-action">
                  <span className="portal-control-label">READY TO PREPARE</span>
                  <h2>{targetMb}MB or less</h2>
                  <p>{fileFits ? 'Your original is already within the limit. We will create a clean submission copy.' : 'Your original is above the limit. We will reduce it progressively.'}</p>
                  {resultSize !== null && (
                    <div className={`portal-result ${resultFits ? 'pass' : 'warn'}`}>
                      {resultFits ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                      <div><strong>{resultFits ? 'Ready for this size limit' : 'Still above the target'}</strong><small>Output: {formatFileSize(resultSize)}</small></div>
                    </div>
                  )}
                  <button className="portal-primary" disabled={processing} onClick={prepare}>
                    {processing ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                    {processing ? 'Preparing…' : 'Prepare & download'}
                    {!processing && <ArrowRight size={15} />}
                  </button>
                  <div className="portal-privacy"><ShieldCheck size={15} /><span><strong>Local processing</strong><small>No account, document storage, or server upload.</small></span></div>
                  <small className="portal-disclaimer">Always open the downloaded PDF and confirm readability before submitting.</small>
                </div>
              </div>
            </section>
          )}

          <section className="portal-seo-copy">
            <span>PRIVATE PDF SIZE REDUCER FOR UPLOAD PORTALS</span>
            <h2>Prepare once, then verify before submitting</h2>
            <p>Portal‑Ready PDF is designed for people searching for a PDF compressor for government forms, visa document upload limits, university submission portals, job applications, and email attachments. It preserves the original file and creates a separate download for review.</p>
            <div>
              <article><h3>Does the file leave my computer?</h3><p>No. Reading, checking, and PDF processing happen in browser memory. Only official-source links open an external website.</p></article>
              <article><h3>Can the tool guarantee an exact size?</h3><p>No honest browser tool can guarantee every PDF will reach every target without quality trade-offs. The result is measured after processing and clearly marked.</p></article>
              <article><h3>Which limit should I choose?</h3><p>Use the value shown beside the actual upload field. Verified presets are conveniences, not a substitute for checking a portal that may change.</p></article>
            </div>
          </section>
        </main>

      </div>
      {processing && <ProcessingOverlay message="Preparing your portal-ready PDF locally…" />}
    </div>
  )
}
