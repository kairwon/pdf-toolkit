import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, BadgeCheck, BookOpenCheck, BriefcaseBusiness, Combine, FileDown,
  FileType, Gift, Image, Layers, LockKeyhole, ScanLine, Stamp,
  ShieldCheck, Split, Target, Upload, WifiOff, Eraser, FilePenLine, ScanText,
  type LucideIcon,
} from 'lucide-react'
import usePageTitle from '../hooks/usePageTitle'
import { setPendingFiles } from '../lib/fileHandoff'
import { formatFileSize } from '../lib/utils'
import ShareButtons from '../components/ui/ShareButtons'
import PdfToolIcon, { pdfIconKindForPath } from '../components/ui/PdfToolIcon'
import useFileDrop from '../hooks/useFileDrop'

type Card = {
  title: string
  description: string
  path: string
  icon: LucideIcon
  tone: 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'rose'
}

const outcomes: Card[] = [
  {
    title: 'Submit my thesis under a limit',
    description: 'Check pages and searchable text, then meet the university file-size requirement.',
    path: '/thesis-pdf-check',
    icon: BookOpenCheck,
    tone: 'blue',
  },
  {
    title: 'Prepare a visa application pack',
    description: 'Organize, combine, and size documents for the relevant embassy portal.',
    path: '/visa-prep',
    icon: BriefcaseBusiness,
    tone: 'cyan',
  },
  {
    title: 'Make a PDF fit an upload portal',
    description: 'Choose the exact portal limit and verify the finished file before submitting.',
    path: '/portal-ready-pdf',
    icon: Target,
    tone: 'green',
  },
  {
    title: 'Make a scanned PDF smaller',
    description: 'Detect image-based scans and reduce their MB size while protecting readable details.',
    path: '/compress/scanned',
    icon: ScanLine,
    tone: 'orange',
  },
  {
    title: 'Combine signed documents',
    description: 'Put separate files and signed pages into one final PDF in the right order.',
    path: '/merge',
    icon: Combine,
    tone: 'purple',
  },
  {
    title: 'Fix and organize PDF pages',
    description: 'Reorder, rotate, or remove pages in a visual workspace before sharing.',
    path: '/manage',
    icon: ScanLine,
    tone: 'rose',
  },
]

const popularTools: Card[] = [
  { title: 'Compress PDF', description: 'Reduce size privately in your browser.', path: '/compress', icon: FileDown, tone: 'blue' },
  { title: 'Merge PDF', description: 'Combine files and reorder their pages.', path: '/merge', icon: Combine, tone: 'purple' },
  { title: 'Split PDF', description: 'Extract a range or separate selected pages.', path: '/split', icon: Split, tone: 'green' },
  { title: 'PDF to Word', description: 'Create an editable document with OCR.', path: '/to-word', icon: FileType, tone: 'blue' },
  { title: 'Word to PDF', description: 'Convert DOC or DOCX with an automatic PDF preview.', path: '/word-to-pdf', icon: FileType, tone: 'cyan' },
  { title: 'Images to PDF', description: 'Combine application photos or scans into one PDF.', path: '/images-to-pdf', icon: Image, tone: 'purple' },
  { title: 'Manage Pages', description: 'Delete, rotate, and reorder visually.', path: '/manage', icon: Layers, tone: 'cyan' },
  { title: 'Visual PDF Editor', description: 'Add text, drawings, signatures and redactions.', path: '/edit', icon: FilePenLine, tone: 'green' },
  { title: 'OCR Searchable PDF', description: 'Add searchable text to scanned pages locally.', path: '/ocr-pdf', icon: ScanText, tone: 'orange' },
]

const featuredSingleWorkflows = [
  { label: 'Thesis check', detail: 'Check submission readiness', path: '/thesis-pdf-check', icon: BookOpenCheck, tone: 'blue' },
  { label: 'Visa pack', detail: 'Organize application documents', path: '/visa-prep', icon: BriefcaseBusiness, tone: 'cyan' },
  { label: 'Portal ready', detail: 'Meet the upload limit', path: '/portal-ready-pdf', icon: Target, tone: 'green' },
] as const

const featuredMultiWorkflows = [
  { label: 'Visa pack', detail: 'Organize application documents', path: '/visa-prep', icon: BriefcaseBusiness, tone: 'cyan' },
] as const

const singleFileShortcuts = [
  { label: 'Compress', path: '/compress', icon: FileDown },
  { label: 'Compress scans', path: '/compress/scanned', icon: ScanLine },
  { label: 'Exact size', path: '/compress/exact', icon: Target },
  { label: 'Split / extract', path: '/split', icon: Split },
  { label: 'Manage pages', path: '/manage', icon: Layers },
  { label: 'PDF to images', path: '/to-image', icon: Image },
  { label: 'PDF to Word', path: '/to-word', icon: FileType },
  { label: 'Add watermark', path: '/watermark', icon: Stamp },
  { label: 'Remove watermark', path: '/unwatermark', icon: Eraser },
  { label: 'Edit, fill & sign', path: '/edit', icon: FilePenLine },
  { label: 'OCR searchable PDF', path: '/ocr-pdf', icon: ScanText },
] as const

const multiFileShortcuts = [
  { label: 'Merge PDFs', path: '/merge', icon: Combine },
] as const

const feedback = [
  {
    quote: 'Finally, I can enter the university limit instead of trying several compression levels.',
    author: 'Anonymous postgraduate',
    context: 'Thesis submission workflow',
    country: 'Germany',
    countryCode: 'DE',
    persona: 'Master’s student',
    avatar: '/testimonials/germany-postgraduate.webp',
  },
  {
    quote: 'Keeping visa documents on my own device removes the part I worry about most.',
    author: 'Anonymous applicant',
    context: 'Visa document workflow',
    country: 'Australia',
    countryCode: 'AU',
    persona: 'Graduate applicant',
    avatar: '/testimonials/australia-applicant.webp',
  },
  {
    quote: 'I do not want to learn PDF terminology. I just need the portal to accept my file.',
    author: 'Anonymous researcher',
    context: 'Outcome-first navigation',
    country: 'United States',
    countryCode: 'US',
    persona: 'Research assistant',
    avatar: '/testimonials/us-researcher.webp',
  },
]

const faqs = [
  {
    question: 'Can I compress a PDF to a specific size, such as 5 MB?',
    answer: 'Yes. Choose the exact-size workflow, enter the upload limit, and Lab of PDF will create a smaller copy and verify whether the result meets your target.',
  },
  {
    question: 'Can I check a thesis PDF before university submission?',
    answer: 'Yes. The thesis workflow checks practical submission details such as file size, page count, searchable text, page format, and orientation before you upload.',
  },
  {
    question: 'Are visa and passport PDFs uploaded to a server?',
    answer: 'Supported workflows process document contents locally in your browser. Your files stay on your device unless a feature clearly tells you otherwise.',
  },
  {
    question: 'Do I need an account to merge, split, or convert a PDF?',
    answer: 'No account is required for the currently available browser-based PDF tools.',
  },
]

export default function LandingPage() {
  usePageTitle('/')
  const navigate = useNavigate()
  const [files, setFiles] = useState<File[]>([])

  const { rootProps, inputProps, isDragActive, open } = useFileDrop({
    onFiles: setFiles,
    multiple: true,
    accept: { 'application/pdf': ['.pdf'] },
  })

  const recommendation = useMemo(() => {
    if (files.length > 1) {
      return {
        title: 'Combine these PDFs',
        copy: 'Multiple files detected. Review their order and merge them in one private workflow.',
        action: 'Open Merge PDF',
        path: '/merge',
      }
    }
    if (files[0]?.size > 10 * 1024 * 1024) {
      return {
        title: 'This PDF may be too large to share',
        copy: 'Enter the exact maximum and use the highest-quality compression that can meet it.',
        action: 'Set a size target',
        path: '/compress/exact',
      }
    }
    return {
      title: 'What do you need to accomplish?',
      copy: 'Start with the portal requirement, or choose a more specific workflow below.',
      action: 'Prepare for a portal',
      path: '/portal-ready-pdf',
    }
  }, [files])

  const navigateWithFiles = (path: string) => {
    setPendingFiles(files)
    navigate(path)
  }

  return (
    <div className="lop-landing">
      <section className="lop-hero">
        <div className="lop-hero-copy">
          <div className="lop-eyebrow">
            <span><Target size={16} /></span>
            Outcome-first PDF tools
          </div>
          <h1>Stop guessing.<br />Hit your PDF <em>target.</em></h1>
          <p>
            Most PDF tools give you settings. Tell us what you actually need to achieve—we
            will guide you to a finished file that meets the requirement.
          </p>
          <div className="lop-hero-actions">
            <button className="lop-primary" onClick={() => document.getElementById('home-upload')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
              <Upload size={18} /> Choose or drop a PDF
            </button>
            <button className="lop-secondary" onClick={() => document.getElementById('real-world-tasks')?.scrollIntoView({ behavior: 'smooth' })}>
              Tell us your goal <ArrowRight size={17} />
            </button>
          </div>
          <div className="lop-trust-row">
            <span><ShieldCheck size={16} /> 100% on-device</span>
            <span><WifiOff size={16} /> Works offline</span>
            <span><Gift size={16} /> Free to use</span>
          </div>
          <div className="lop-home-share">
            <ShareButtons path="/" title="Lab of PDF — private PDF tools for real document requirements" />
          </div>
        </div>

        <div className="lop-upload-card" id="home-upload">
          <div className="lop-window-head">
            <span className="lop-window-dots"><i /><i /><i /></span>
            <span><LockKeyhole size={13} /> LOCAL ONLY</span>
          </div>
          <div
            {...rootProps}
            role="button"
            tabIndex={0}
            aria-label={files.length > 0
              ? 'PDF loaded. Click an empty area or drop another PDF to replace it.'
              : 'Click anywhere or drop PDF files here to load them.'}
            className={`lop-dropzone ${isDragActive ? 'dragging' : ''} ${files.length > 0 ? 'has-files' : ''}`}
          >
            <input {...inputProps} hidden />
            {files.length === 0 ? (
              <div className="lop-drop-empty">
                <span className="lop-upload-icon"><Upload size={28} /></span>
                <h2>{isDragActive ? 'Drop your PDF here' : 'Drop a PDF. Tell us the goal.'}</h2>
                <p>Click anywhere in this box or drop PDF files here—your documents stay local.</p>
                <button type="button" onClick={open}>Choose PDF</button>
              </div>
            ) : (
              <div className="lop-file-ready">
                <div className="lop-selected-file">
                  <span><BadgeCheck size={22} /></span>
                  <div>
                    <strong>{files.length > 1 ? `${files.length} PDF files selected` : files[0].name}</strong>
                    <small>{formatFileSize(files.reduce((total, file) => total + file.size, 0))} · Ready on this device</small>
                  </div>
                </div>
                <div className="lop-suggestion">
                  <span>SUGGESTED NEXT STEP</span>
                  <h3>{recommendation.title}</h3>
                  <p>{recommendation.copy}</p>
                  <div>
                    <button type="button" onClick={() => navigateWithFiles(recommendation.path)}>{recommendation.action}</button>
                    <button type="button" onClick={open}>Change file</button>
                  </div>
                </div>
                <div className="lop-featured-shortcuts">
                  <span className="lop-shortcuts-label">LAB OF PDF WORKFLOWS</span>
                  <div>
                    {(files.length > 1 ? featuredMultiWorkflows : featuredSingleWorkflows).map(({ label, detail, path, icon, tone }) => (
                      <button key={path} type="button" onClick={() => navigateWithFiles(path)}>
                        <PdfToolIcon icon={icon} label={label} tone={tone} size="compact" kind={pdfIconKindForPath(path)} />
                        <span><strong>{label}</strong><small>{detail}</small></span>
                        <ArrowRight size={15} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="lop-file-shortcuts">
                  <span className="lop-shortcuts-label">QUICK PDF TOOLS</span>
                  <div>
                    {(files.length > 1 ? multiFileShortcuts : singleFileShortcuts).map(({ label, path, icon: Icon }) => (
                      <button key={path} type="button" onClick={() => navigateWithFiles(path)}>
                        <PdfToolIcon icon={Icon} label={label} size="compact" kind={pdfIconKindForPath(path)} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="lop-upload-foot">
            <span><ShieldCheck size={14} /> Private processing</span>
            <span>PDF · multiple files supported</span>
          </div>
        </div>
        <div className="lop-mobile-share">
          <ShareButtons path="/" title="Lab of PDF — private PDF tools for real document requirements" />
        </div>
      </section>

      <section className="lop-outcomes" id="real-world-tasks">
        <div className="lop-section-heading">
          <div>
            <span>START WITH THE REAL PROBLEM</span>
            <h2>What are you trying to get done?</h2>
          </div>
          <p>You do not need to know which operation or compression setting to choose. Pick the result you need.</p>
        </div>
        <div className="lop-outcome-grid">
          {outcomes.map(({ title, description, path, icon: Icon, tone }) => (
            <Link key={title} className="lop-outcome-card" to={path}>
              <PdfToolIcon icon={Icon} label={title} tone={tone} kind={pdfIconKindForPath(path)} />
              <span><strong>{title}</strong><small>{description}</small></span>
              <ArrowRight size={15} />
            </Link>
          ))}
        </div>

        <div className="lop-difference">
          <div>
            <span>GENERIC PDF TOOLS</span>
            <strong>“Choose a compression level.”</strong>
            <p>You pick an operation, adjust settings, and hope the output works.</p>
          </div>
          <i><ArrowRight size={18} /></i>
          <div>
            <span>LAB OF PDF</span>
            <strong>“Make my thesis smaller than 5 MB.”</strong>
            <p>You give us the requirement. We guide the process and confirm the result.</p>
          </div>
        </div>
      </section>

      <section className="lop-story">
        <div className="lop-story-card">
          <span className="lop-section-label">WHY WE BUILT LAB OF PDF</span>
          <h2>PDF tools should understand the requirement.</h2>
          <p>
            People rarely wake up wanting to “compress a PDF.” They need a university portal
            to accept a thesis, an embassy to accept a document pack, or a client to receive
            a final contract.
          </p>
          <div className="lop-principles">
            <div><span><Target size={17} /></span><p><strong>Outcome first</strong><small>Start with the real-world goal, then choose the operation.</small></p></div>
            <div><span><ShieldCheck size={17} /></span><p><strong>Private by default</strong><small>Documents stay on this device during supported workflows.</small></p></div>
            <div><span><Gift size={17} /></span><p><strong>Respectful funding</strong><small>Ads may support free tools, but never inside the processing workspace.</small></p></div>
          </div>
        </div>

        <div className="lop-feedback">
          <div className="lop-feedback-head">
            <h2>What people want from us</h2>
            <span>ANONYMOUS USER NEEDS</span>
          </div>
          {feedback.map((item) => (
            <article key={item.context}>
              <div className="lop-feedback-meta">
                <span className="lop-country"><b>{item.countryCode}</b>{item.country}</span>
                <span className="lop-persona">{item.persona}</span>
              </div>
              <blockquote>“{item.quote}”</blockquote>
              <div className="lop-feedback-author">
                <span className="lop-anonymous-avatar" aria-hidden="true">
                  <img src={item.avatar} alt="" loading="lazy" />
                  <span />
                </span>
                <p><strong>{item.author}</strong><small>{item.context}</small></p>
                <span className="lop-anonymous-status">Identity protected</span>
              </div>
            </article>
          ))}
          <p className="lop-feedback-note">Illustrative anonymized user scenarios. Published testimonials will only use permission-cleared feedback.</p>
        </div>
      </section>

      <section className="lop-tools" id="popular-tools">
        <div className="lop-section-heading">
          <div>
            <span>KNOW EXACTLY WHAT YOU NEED?</span>
            <h2>Popular PDF tools</h2>
          </div>
          <p>Jump straight into familiar operations. Every tool below already runs locally in this app.</p>
        </div>
        <div className="lop-tools-grid">
          {popularTools.map(({ title, description, path, icon: Icon, tone }) => (
            <Link key={title} to={path}>
              <PdfToolIcon icon={Icon} label={title} tone={tone} kind={pdfIconKindForPath(path)} />
              <strong>{title}</strong>
              <small>{description}</small>
              <i><ArrowRight size={14} /></i>
            </Link>
          ))}
        </div>
        <Link className="lop-all-tools" to="/tools">
          View all PDF tools <ArrowRight size={16} />
        </Link>
      </section>

      <section className="lop-faq" aria-labelledby="faq-title">
        <div className="lop-section-heading">
          <div>
            <span>COMMON PDF QUESTIONS</span>
            <h2 id="faq-title">Practical answers before you start</h2>
          </div>
          <p>Clear answers about file limits, private processing, university submissions, and everyday PDF tasks.</p>
        </div>
        <div className="lop-faq-grid">
          {faqs.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lop-privacy">
        <span><ShieldCheck size={24} /></span>
        <div>
          <h2>Your documents stay yours.</h2>
          <p>Supported PDF operations run locally in your browser. No account is required.</p>
        </div>
        <button onClick={() => navigate('/privacy')}>How privacy works <ArrowRight size={14} /></button>
      </section>
    </div>
  )
}
