import { useState, useCallback } from 'react'
import {
  Loader2, Download, Target, BadgeCheck, FileSearch, FileText, Ruler,
  RotateCw, ShieldCheck, AlertTriangle, CheckCircle2, ArrowRight,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import ToolHeader from '../components/ui/ToolHeader'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import { analyzePdfForSubmission, compressPdf, getPageCount, type SubmissionAnalysis } from '../lib/pdf'
import { formatFileSize, downloadBlob, triggerDownloadOverlay } from '../lib/utils'
import usePageTitle from '../hooks/usePageTitle'
import usePendingFiles from '../hooks/usePendingFiles'

type Level = 'lossless' | 'balanced' | 'aggressive'

const levelInfo: Record<Level, { label: string; desc: string }> = {
  lossless: { label: 'Lossless', desc: 'Removes unused objects — text stays text, no quality loss' },
  balanced: { label: 'Balanced scan copy', desc: 'Renders pages as compressed images; smaller, but text is no longer selectable' },
  aggressive: { label: 'Maximum reduction', desc: 'Lower-resolution image copy for strict limits; inspect small text carefully' },
}

export default function CompressPage({ forcedGoal }: { forcedGoal?: string } = {}) {
  usePageTitle(forcedGoal === 'thesis' ? '/thesis-pdf-check' : forcedGoal === 'visa' ? '/compress/visa' : forcedGoal === 'exact' ? '/compress/exact' : '/compress')
  const [searchParams] = useSearchParams()
  const goal = forcedGoal ?? searchParams.get('goal')
  const goalConfig = goal === 'thesis'
    ? { title: 'Thesis PDF Check', description: 'Review and prepare a technically healthy PDF without changing your academic content or layout.', target: 0, level: 'lossless' as Level, label: 'General thesis check' }
    : goal === 'visa'
      ? { title: 'Visa Document Compressor', description: 'Prepare a smaller application PDF for strict embassy upload portals.', target: 2, level: 'aggressive' as Level, label: 'Visa preset' }
      : goal === 'exact'
        ? { title: 'Target Size Compressor', description: 'Set your maximum file size and receive a clear result check after compression.', target: 5, level: 'balanced' as Level, label: 'Custom target' }
        : { title: 'Compress PDF', description: 'Reduce PDF size privately in your browser while keeping text searchable.', target: 0, level: 'lossless' as Level, label: 'Standard compression' }
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [level, setLevel] = useState<Level>(goalConfig.level)
  const [targetMb, setTargetMb] = useState(goalConfig.target)
  const [processing, setProcessing] = useState(false)
  const [analysis, setAnalysis] = useState<SubmissionAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setAnalyzing(true)
    try {
      if (goal === 'thesis') {
        const result = await analyzePdfForSubmission(f)
        setAnalysis(result)
        setPageCount(result.pageCount)
        toast.success(`Analysis complete — ${result.pageCount} pages`)
      } else {
        const total = await getPageCount(f)
        setPageCount(total)
        toast.success(`Loaded ${total} pages`)
      }
    } catch {
      setFile(null)
      toast.error('We could not read this PDF')
    } finally {
      setAnalyzing(false)
    }
  }, [goal])
  usePendingFiles(handleFile)

  const handleCompress = async () => {
    if (!file) return
    setProcessing(true)
    try {
      const before = file.size
      const candidate = await compressPdf(file, level)
      const result = candidate.byteLength < before
        ? candidate
        : new Uint8Array(await file.arrayBuffer())
      const blob = new Blob([Uint8Array.from(result).buffer], { type: 'application/pdf' })
      const savedValue = (before - blob.size) / before * 100
      const saved = savedValue.toFixed(1)
      const targetBytes = targetMb > 0 ? targetMb * 1024 * 1024 : 0
      const meetsTarget = targetBytes > 0 && blob.size <= targetBytes
      const resultMessage = targetBytes > 0
        ? meetsTarget
          ? `Ready to submit — under ${targetMb}MB`
          : savedValue > 0
            ? `Compressed ${saved}% — still above ${targetMb}MB`
            : `No smaller copy found — still above ${targetMb}MB`
        : savedValue > 0
          ? `Compressed! Reduced by ${saved}%`
          : 'Already optimized — no smaller copy found'
      triggerDownloadOverlay(resultMessage, () => {
        downloadBlob(blob, `compressed-${file.name}`)
      })
    } catch {
      toast.error('Compression failed')
    } finally {
      setProcessing(false)
    }
  }

  if (!file) {
    return (
      <ToolPageWrapper>
        <ToolHeader title={goalConfig.title} description={`${goalConfig.description} Your file never leaves this device.`} />
        {goal && (
          <div className="goal-summary">
            <div><Target size={17} /><span><strong>{goalConfig.label}</strong><small>{goal === 'thesis' ? 'Technical PDF review · optional size limit' : `Target: ${targetMb}MB or less`}</small></span></div>
            <BadgeCheck size={18} />
          </div>
        )}
        <FileUpload onFiles={handleFile} multiple={false} />
        </ToolPageWrapper>
    )
  }

  if (goal === 'thesis') {
    const hasTarget = targetMb > 0
    const targetBytes = hasTarget ? targetMb * 1024 * 1024 : 0
    const sizePass = hasTarget && file.size <= targetBytes
    const checks = [
      {
        label: 'File size',
        value: hasTarget ? `${formatFileSize(file.size)} / ${targetMb} MB limit` : formatFileSize(file.size),
        detail: hasTarget ? (sizePass ? 'Within your selected limit' : 'Above your selected limit') : 'No university limit selected',
        status: hasTarget ? (sizePass ? 'pass' : 'warning') : 'neutral',
        icon: Target,
      },
      {
        label: 'Searchable text',
        value: analysis ? (analysis.textStatus === 'searchable' ? 'Text detected' : analysis.textStatus === 'mixed' ? 'Mixed document' : 'Scanned document') : 'Checking…',
        detail: analysis ? `Information only · sampled ${analysis.sampledPages} pages` : 'Sampling pages locally',
        status: analysis ? 'neutral' : 'loading',
        icon: FileText,
      },
      {
        label: 'Page format',
        value: analysis?.pageFormat ?? 'Checking…',
        detail: 'Information only · no page-size rule assumed',
        status: analysis ? 'neutral' : 'loading',
        icon: Ruler,
      },
      {
        label: 'Page orientation',
        value: analysis ? (analysis.landscapePages === 0 ? 'All portrait' : `${analysis.landscapePages} landscape page${analysis.landscapePages === 1 ? '' : 's'}`) : 'Checking…',
        detail: analysis?.landscapePages ? 'Review only · charts may be intentionally horizontal' : 'Document orientation profile',
        status: analysis ? 'neutral' : 'loading',
        icon: RotateCw,
      },
    ]

    return (
      <div className="thesis-workspace">
        <div className="thesis-stepper" aria-label="Thesis submission progress">
          {['Upload', 'Review', 'Optimize', 'Download'].map((step, index) => (
            <div className={index <= 1 ? 'active' : ''} key={step}>
              <span>{index + 1}</span><strong>{step}</strong>
            </div>
          ))}
        </div>

        <div className="thesis-hero">
          <div>
            <span className="thesis-eyebrow"><ShieldCheck size={13} /> LOCAL ANALYSIS COMPLETE</span>
            <h1>Your thesis PDF profile</h1>
            <p>We created a neutral technical overview without assuming your university’s rules. Your file stayed in this browser.</p>
          </div>
          <button onClick={() => { setFile(null); setPageCount(0); setAnalysis(null) }}>Choose another PDF</button>
        </div>

        <div className="thesis-file-card">
          <div className="thesis-file-icon"><FileSearch size={23} /></div>
          <div className="thesis-file-name"><strong>{file.name}</strong><span>{pageCount} pages · {formatFileSize(file.size)}</span></div>
          <div className="thesis-file-private"><ShieldCheck size={15} /><span><strong>Private</strong><small>Not uploaded</small></span></div>
        </div>

        <div className="thesis-dashboard">
          <section className="thesis-checks">
            <div className="thesis-section-head">
              <div><span>TECHNICAL PROFILE</span><h2>PDF format overview</h2></div>
              <div className="review-score ready">Information</div>
            </div>
            <div className="check-grid">
              {checks.map(({ label, value, detail, status, icon: Icon }) => (
                <article className={`check-card ${status}`} key={label}>
                  <div className="check-icon"><Icon size={18} /></div>
                  <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
                  {status === 'pass' ? <CheckCircle2 size={18} /> : status === 'warning' ? <AlertTriangle size={18} /> : null}
                </article>
              ))}
            </div>
          </section>

          <aside className="thesis-target-panel">
            <span className="thesis-panel-label">SUBMISSION TARGET</span>
            <h2>Optional file limit</h2>
            <p>Only add a limit if your university portal gives you one. We do not assume a universal requirement.</p>
            <div className="limit-choice">
              <button className={!hasTarget ? 'active' : ''} onClick={() => setTargetMb(0)}>No limit</button>
              <button className={hasTarget ? 'active' : ''} onClick={() => setTargetMb(targetMb || 10)}>I know my limit</button>
            </div>
            {hasTarget && (
              <>
                <label htmlFor="thesis-target">Maximum file size</label>
                <div className="thesis-target-input">
                  <input id="thesis-target" type="number" min="0.5" step="0.5" value={targetMb} onChange={(event) => setTargetMb(Math.max(.5, Number(event.target.value)))} />
                  <span>MB</span>
                </div>
                <div className="target-presets">
                  {[5, 10, 20].map((size) => <button className={targetMb === size ? 'active' : ''} onClick={() => setTargetMb(size)} key={size}>{size} MB</button>)}
                </div>
              </>
            )}
            <div className="thesis-recommendation">
              <BadgeCheck size={17} />
              <div>
                <strong>{!hasTarget ? 'Conservative preparation' : sizePass ? 'No compression required' : 'Optimization recommended'}</strong>
                <span>{!hasTarget ? 'Keep pages, dimensions, text, and layout unchanged.' : sizePass ? 'Your PDF is already within the limit you entered.' : 'Reduce file overhead while preserving the document structure.'}</span>
              </div>
            </div>
            <button className="thesis-primary-action" onClick={handleCompress} disabled={processing || analyzing}>
              {processing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {processing ? 'Preparing thesis…' : !hasTarget ? 'Create clean submission copy' : sizePass ? 'Create submission copy' : 'Optimize for submission'}
              {!processing && <ArrowRight size={15} />}
            </button>
            <small className="thesis-disclaimer">Technical format only. No universal university requirement is assumed.</small>
          </aside>
        </div>
        {processing && <ProcessingOverlay message="Preparing your submission copy…" />}
      </div>
    )
  }

  return (
    <ToolPageWrapper>
      <ToolHeader title={goalConfig.title} description="All modes keep text selectable and searchable. We will check the result against your target." />
      <div className="p-4 mb-5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.name}</p>
          <p className="text-xs text-gray-400">{formatFileSize(file.size)} · {pageCount} pages</p>
        </div>
        <button onClick={() => { setFile(null); setPageCount(0) }} className="btn-ghost">Change file</button>
      </div>

      <div className="p-5 mb-5 space-y-2.5" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
        {goal && (
          <div className="target-control">
            <label htmlFor="target-size">Maximum file size</label>
            <div><input id="target-size" type="number" min="0.1" step="0.1" value={targetMb} onChange={(event) => setTargetMb(Math.max(0.1, Number(event.target.value)))} /><span>MB</span></div>
          </div>
        )}
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
        <span className="text-sm text-gray-400">{pageCount} pages{targetMb > 0 ? ` · target ≤ ${targetMb}MB` : ''}</span>
        <button onClick={handleCompress} disabled={processing} className="btn-primary flex items-center gap-2">
          {processing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {processing ? 'Compressing...' : 'Compress & Download'}
        </button>
      </div>
      {processing && <ProcessingOverlay message="Compressing PDF..." />}
    </ToolPageWrapper>
  )
}
