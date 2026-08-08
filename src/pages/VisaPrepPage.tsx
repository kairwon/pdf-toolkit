import { useCallback, useMemo, useState } from 'react'
import {
  ArrowDown, ArrowRight, ArrowUp, BadgeCheck, BriefcaseBusiness, Download,
  ExternalLink, FileArchive, FileCheck2, FileKey2, FilePlus2, Files, Loader2,
  LockKeyhole, RotateCcw, ShieldCheck, Trash2,
} from 'lucide-react'
import JSZip from 'jszip'
import { toast } from 'sonner'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import { compressPdf, getPageCount, mergePdfs } from '../lib/pdf'
import { downloadBlob, formatFileSize, triggerDownloadOverlay } from '../lib/utils'
import usePageTitle from '../hooks/usePageTitle'
import usePendingFiles from '../hooks/usePendingFiles'

type OutputMode = 'combined' | 'separate'
type DocumentCategory = 'Passport & ID' | 'Financial evidence' | 'Travel history' | 'Accommodation' | 'Employment' | 'Invitation & support' | 'Other'

interface VisaDocument {
  id: string
  file: File
  pages: number
  category: DocumentCategory
  targetMb: number
}

interface PortalProfile {
  id: string
  label: string
  limitMb: number
  note: string
  source?: string
}

const categories: DocumentCategory[] = [
  'Passport & ID', 'Financial evidence', 'Travel history', 'Accommodation',
  'Employment', 'Invitation & support', 'Other',
]
const destinations = ['General application', 'Canada', 'United Kingdom', 'Schengen area', 'Australia', 'New Zealand', 'United States', 'Other']
const portalProfiles: Record<string, PortalProfile[]> = {
  Canada: [
    { id: 'ca-secure', label: 'IRCC secure account', limitMb: 4, note: 'Official maximum per file.', source: 'https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=1123&top=23' },
    { id: 'ca-portal', label: 'IRCC Portal / new portal', limitMb: 5, note: 'Official maximum per file.', source: 'https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=1123&top=23' },
    { id: 'ca-pr', label: 'Permanent Residence Portal', limitMb: 4, note: 'Official maximum per file.', source: 'https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=1123&top=23' },
  ],
  'United States': [
    { id: 'us-ceac', label: 'NVC / CEAC immigrant visa', limitMb: 2, note: 'Official maximum for each scanned document.', source: 'https://travel.state.gov/content/travel/en/us-visas/immigrate/the-immigrant-visa-process/step-1-submit-a-petition/step-2-begin-nvc-processing/scanning-and-uploading-tips.html' },
  ],
  'New Zealand': [
    { id: 'nz-online', label: 'Immigration Online — Visitor Visa', limitMb: 10, note: 'Official Visitor Visa guide maximum per supporting PDF; other visa forms may differ.', source: 'https://www.immigration.govt.nz/assets/inz/documents/forms-and-guides/visitor-visa-guide-english-final.pdf' },
  ],
}
const manualProfile: PortalProfile = {
  id: 'manual',
  label: 'Use the limit shown in my portal',
  limitMb: 0,
  note: 'No verified universal PDF limit applies to every application for this destination.',
}

function safeFileName(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'visa-application'
}

export default function VisaPrepPage() {
  usePageTitle('/visa-prep')
  const [destination, setDestination] = useState('General application')
  const [portalId, setPortalId] = useState('manual')
  const [packName, setPackName] = useState('Visa application documents')
  const [outputMode, setOutputMode] = useState<OutputMode>('combined')
  const [targetMb, setTargetMb] = useState(0)
  const [documents, setDocuments] = useState<VisaDocument[]>([])
  const [reading, setReading] = useState(false)
  const [processing, setProcessing] = useState(false)

  const totalPages = useMemo(() => documents.reduce((sum, item) => sum + item.pages, 0), [documents])
  const totalSize = useMemo(() => documents.reduce((sum, item) => sum + item.file.size, 0), [documents])
  const profiles = portalProfiles[destination] || [manualProfile]
  const activeProfile = profiles.find((profile) => profile.id === portalId) || profiles[0]
  const overLimitCount = useMemo(() => documents.filter((item) => item.targetMb > 0 && item.file.size > item.targetMb * 1024 * 1024).length, [documents])

  const chooseDestination = (value: string) => {
    const nextProfile = (portalProfiles[value] || [manualProfile])[0]
    setDestination(value)
    setPortalId(nextProfile.id)
    setTargetMb(nextProfile.limitMb)
    setDocuments((current) => current.map((item) => ({ ...item, targetMb: nextProfile.limitMb })))
  }

  const choosePortal = (id: string) => {
    const nextProfile = profiles.find((profile) => profile.id === id) || profiles[0]
    setPortalId(nextProfile.id)
    setTargetMb(nextProfile.limitMb)
    setDocuments((current) => current.map((item) => ({ ...item, targetMb: nextProfile.limitMb })))
  }

  const applySuggestedLimit = () => {
    setDocuments((current) => current.map((item) => ({ ...item, targetMb: activeProfile.limitMb })))
    setTargetMb(activeProfile.limitMb)
    toast.success(activeProfile.limitMb > 0 ? `${activeProfile.limitMb}MB applied to every file` : 'File limits cleared')
  }

  const handleFiles = useCallback(async (files: File[]) => {
    setReading(true)
    try {
      const newItems = await Promise.all(files.map(async (file, index) => ({
        id: `${file.name}-${file.lastModified}-${index}-${crypto.randomUUID()}`,
        file,
        pages: await getPageCount(file),
        category: 'Other' as DocumentCategory,
        targetMb: activeProfile.limitMb,
      })))
      setDocuments((current) => [...current, ...newItems])
      toast.success(`${newItems.length} document${newItems.length === 1 ? '' : 's'} added`)
    } catch {
      toast.error('One or more PDFs could not be read')
    } finally {
      setReading(false)
    }
  }, [activeProfile.limitMb])
  usePendingFiles(handleFiles)

  const moveDocument = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= documents.length) return
    setDocuments((current) => {
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      return next
    })
  }

  const updateCategory = (id: string, category: DocumentCategory) => {
    setDocuments((current) => current.map((item) => item.id === id ? { ...item, category } : item))
  }

  const updateFileTarget = (id: string, value: number) => {
    setDocuments((current) => current.map((item) => item.id === id ? { ...item, targetMb: Math.max(0, value) } : item))
  }

  const createPackage = async () => {
    if (documents.length === 0) return
    setProcessing(true)
    try {
      const baseName = safeFileName(packName)
      if (outputMode === 'combined') {
        const merged = await mergePdfs(documents.map((item) => ({
          file: item.file,
          pageIndices: Array.from({ length: item.pages }, (_, index) => index),
        })))
        const mergedFile = new File([Uint8Array.from(merged).buffer], `${baseName}.pdf`, { type: 'application/pdf' })
        const prepared = await compressPdf(mergedFile, 'lossless')
        const blob = new Blob([Uint8Array.from(prepared).buffer], { type: 'application/pdf' })
        const overLimit = targetMb > 0 && blob.size > targetMb * 1024 * 1024
        triggerDownloadOverlay(overLimit ? `Package created — above ${targetMb}MB` : 'Combined visa package ready', () => downloadBlob(blob, `${baseName}.pdf`))
        toast.success(overLimit ? `Package created, but it is above ${targetMb}MB` : 'Combined visa package created')
      } else {
        const zip = new JSZip()
        const filesStillOver: string[] = []
        for (let index = 0; index < documents.length; index++) {
          const item = documents[index]
          const prepared = await compressPdf(item.file, 'lossless')
          const category = safeFileName(item.category).toLowerCase()
          zip.file(`${String(index + 1).padStart(2, '0')}-${category}-${safeFileName(item.file.name)}`, prepared)
          if (item.targetMb > 0 && prepared.byteLength > item.targetMb * 1024 * 1024) filesStillOver.push(item.file.name)
        }
        const blob = await zip.generateAsync({ type: 'blob' })
        triggerDownloadOverlay('Organized visa ZIP ready', () => downloadBlob(blob, `${baseName}.zip`))
        toast.success(filesStillOver.length > 0 ? `ZIP created; ${filesStillOver.length} file${filesStillOver.length === 1 ? '' : 's'} still exceed the target` : 'Organized visa document ZIP created')
      }
    } catch {
      toast.error('We could not create this document package')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="visa-workspace">
      <div className="visa-stepper">
        {['Set up', 'Add documents', 'Review', 'Download'].map((label, index) => {
          const active = index === 0 || (documents.length > 0 && index <= 2)
          return <div className={active ? 'active' : ''} key={label}><span>{index + 1}</span><strong>{label}</strong></div>
        })}
      </div>

      <header className="visa-hero">
        <div>
          <span><LockKeyhole size={13} /> PRIVATE VISA DOCUMENT WORKFLOW</span>
          <h1>Build a clean visa document pack</h1>
          <p>Organize, label, reorder, and prepare sensitive PDFs without uploading passports, IDs, or financial documents.</p>
        </div>
        <div className="visa-privacy-seal"><ShieldCheck size={21} /><div><strong>Browser only</strong><small>Your documents are not uploaded</small></div></div>
      </header>

      <div className="visa-layout">
        <main>
          <section className="visa-section">
            <div className="visa-section-title"><span>01</span><div><strong>Application setup</strong><small>Choose the actual government portal so its verified file limit can be applied.</small></div></div>
            <div className="visa-setup-grid">
              <label>Destination or application
                <select value={destination} onChange={(event) => chooseDestination(event.target.value)}>
                  {destinations.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>Official portal or workflow
                <select value={activeProfile.id} onChange={(event) => choosePortal(event.target.value)}>
                  {profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.label}</option>)}
                </select>
              </label>
              <label>Package name
                <input value={packName} onChange={(event) => setPackName(event.target.value)} placeholder="Visa application documents" />
              </label>
            </div>
            <div className={`visa-official-rule ${activeProfile.limitMb > 0 ? 'verified' : ''}`}>
              <BadgeCheck size={17} />
              <div>
                <strong>{activeProfile.limitMb > 0 ? `${activeProfile.limitMb}MB per file` : 'Enter the limit shown by your portal'}</strong>
                <span>{activeProfile.note}</span>
              </div>
              {activeProfile.source && <a href={activeProfile.source} target="_blank" rel="noreferrer">Official source <ExternalLink size={12} /></a>}
            </div>
            <div className="visa-output-options">
              <button className={outputMode === 'combined' ? 'active' : ''} onClick={() => setOutputMode('combined')}>
                <Files size={20} /><span><strong>One combined PDF</strong><small>Best when one upload field accepts one file</small></span><BadgeCheck size={17} />
              </button>
              <button className={outputMode === 'separate' ? 'active' : ''} onClick={() => setOutputMode('separate')}>
                <FileArchive size={20} /><span><strong>Separate files in ZIP</strong><small>Keep categories separate and consistently named</small></span><BadgeCheck size={17} />
              </button>
            </div>
          </section>

          <section className="visa-section">
            <div className="visa-section-title"><span>02</span><div><strong>Add PDF documents</strong><small>Files remain in browser memory while you prepare the package.</small></div></div>
            <div className="visa-upload-compact">
              <FileUpload onFiles={handleFiles} multiple />
              {reading && <div className="visa-reading"><Loader2 className="animate-spin" size={16} /> Reading documents locally…</div>}
            </div>

            {documents.length > 0 && (
              <div className="visa-document-list">
                {documents.map((item, index) => (
                  <article key={item.id}>
                    <div className="visa-order">{String(index + 1).padStart(2, '0')}</div>
                    <div className="visa-doc-icon"><FileKey2 size={18} /></div>
                    <div className="visa-doc-info"><strong>{item.file.name}</strong><small>{item.pages} pages · {formatFileSize(item.file.size)}</small></div>
                    <div className="visa-doc-controls">
                      <select value={item.category} onChange={(event) => updateCategory(item.id, event.target.value as DocumentCategory)}>
                        {categories.map((category) => <option key={category}>{category}</option>)}
                      </select>
                      <label><input aria-label={`Size limit for ${item.file.name}`} type="number" min="0" step=".5" value={item.targetMb || ''} placeholder="—" onChange={(event) => updateFileTarget(item.id, Number(event.target.value))} /><span>MB</span></label>
                      <em className={item.targetMb === 0 ? 'manual' : item.file.size > item.targetMb * 1024 * 1024 ? 'over' : 'ready'}>
                        {item.targetMb === 0 ? 'Set limit' : item.file.size > item.targetMb * 1024 * 1024 ? 'Needs reduction' : 'Within limit'}
                      </em>
                    </div>
                    <div className="visa-doc-actions">
                      <button aria-label={`Move ${item.file.name} up`} disabled={index === 0} onClick={() => moveDocument(index, -1)}><ArrowUp size={14} /></button>
                      <button aria-label={`Move ${item.file.name} down`} disabled={index === documents.length - 1} onClick={() => moveDocument(index, 1)}><ArrowDown size={14} /></button>
                      <button aria-label={`Remove ${item.file.name}`} onClick={() => setDocuments((current) => current.filter((document) => document.id !== item.id))}><Trash2 size={14} /></button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className="visa-review-card">
          <span className="visa-review-label">LIVE REVIEW</span>
          <h2>Document package</h2>
          <div className="visa-summary">
            <div><FilePlus2 size={17} /><span><strong>{documents.length}</strong><small>PDF files</small></span></div>
            <div><FileCheck2 size={17} /><span><strong>{totalPages}</strong><small>Total pages</small></span></div>
            <div><BriefcaseBusiness size={17} /><span><strong>{formatFileSize(totalSize)}</strong><small>Input size</small></span></div>
          </div>
          <div className="visa-review-row"><span>Destination</span><strong>{destination}</strong></div>
          <div className="visa-review-row"><span>Output</span><strong>{outputMode === 'combined' ? 'Combined PDF' : 'Organized ZIP'}</strong></div>
          <div className="visa-review-row"><span>File checks</span><strong>{documents.length === 0 ? 'Waiting for files' : overLimitCount > 0 ? `${overLimitCount} over target` : 'All within targets'}</strong></div>
          <div className="visa-limit-block">
            <label>{outputMode === 'combined' ? 'Final combined-file limit' : 'Per-file limits'}</label>
            <p>{outputMode === 'combined' ? 'A combined PDF is one upload, so this checks the final package.' : 'Each file keeps an editable target. ZIP size itself is not an upload limit.'}</p>
            <div className="limit-choice">
              <button className={targetMb === 0 ? 'active' : ''} onClick={() => setTargetMb(0)}>No limit</button>
              <button className={targetMb > 0 ? 'active' : ''} onClick={() => setTargetMb(targetMb || 5)}>Set limit</button>
            </div>
            {targetMb > 0 && <div className="visa-limit-input"><input type="number" min=".5" step=".5" value={targetMb} onChange={(event) => setTargetMb(Math.max(.5, Number(event.target.value)))} /><span>MB</span></div>}
            <button className="visa-apply-limit" onClick={applySuggestedLimit}><RotateCcw size={12} /> {activeProfile.limitMb > 0 ? `Reset all files to ${activeProfile.limitMb}MB` : 'Clear all file limits'}</button>
          </div>
          <div className="visa-safety-note"><ShieldCheck size={17} /><div><strong>Nothing leaves this browser</strong><span>PDF contents, names, and categories are processed locally.</span></div></div>
          <button className="visa-create-button" disabled={documents.length === 0 || processing} onClick={createPackage}>
            {processing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {processing ? 'Building package…' : outputMode === 'combined' ? 'Create combined PDF' : 'Create organized ZIP'}
            {!processing && <ArrowRight size={15} />}
          </button>
          <small className="visa-disclaimer">This tool organizes technical files only. It does not verify visa eligibility or document sufficiency.</small>
        </aside>
      </div>
      {processing && <ProcessingOverlay message="Preparing your visa document package locally…" />}
    </div>
  )
}
