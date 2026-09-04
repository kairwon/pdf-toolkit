import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BriefcaseBusiness,
  Crop,
  FileArchive,
  FileCheck2,
  FileImage,
  FileOutput,
  FileSearch,
  Files,
  FileText,
  FormInput,
  GraduationCap,
  Highlighter,
  Images,
  Layers3,
  LockKeyhole,
  Scissors,
  ScanText,
  Search,
  ShieldX,
  Signature,
  Stamp,
  Tags,
  Workflow,
  X,
} from 'lucide-react'
import usePageTitle from '../hooks/usePageTitle'
import PdfToolIcon, { pdfIconKindForPath } from '../components/ui/PdfToolIcon'

const groups = [
  {
    title: 'Solve a real requirement',
    description: 'Start with the result you need, not a technical operation.',
    tools: [
      { title: 'Thesis PDF check', note: 'Check submission readiness and common issues.', path: '/thesis-pdf-check', icon: GraduationCap },
      { title: 'Visa application prep', note: 'Prepare documents for a visa upload workflow.', path: '/visa-prep', icon: BriefcaseBusiness },
      { title: 'Portal-ready PDF', note: 'Make a PDF easier to upload to online portals.', path: '/portal-ready-pdf', icon: FileCheck2 },
      { title: 'Reusable workflows', note: 'Process multiple PDFs with one saved local sequence.', path: '/workflows', icon: Workflow },
    ],
  },
  {
    title: 'Organize PDFs',
    description: 'Combine, separate, and reorder documents.',
    tools: [
      { title: 'Merge PDFs', note: 'Combine files in the order you choose.', path: '/merge', icon: Files },
      { title: 'Split PDF', note: 'Extract the pages you actually need.', path: '/split', icon: Scissors },
      { title: 'Manage pages', note: 'Reorder, rotate, or remove PDF pages.', path: '/manage', icon: Layers3 },
    ],
  },
  {
    title: 'Compress and convert',
    description: 'Meet size limits and move content into useful formats.',
    tools: [
      { title: 'Compress PDF', note: 'Reduce file size for email or upload.', path: '/compress', icon: FileArchive },
      { title: 'Compress scanned PDF', note: 'Detect image-based scans and reduce their MB size.', path: '/compress/scanned', icon: FileSearch },
      { title: 'Compress to exact size', note: 'Aim for a specific portal limit.', path: '/compress/exact', icon: FileOutput },
      { title: 'PDF to Word', note: 'Turn a PDF into an editable document.', path: '/to-word', icon: FileText },
      { title: 'Word to PDF', note: 'Convert DOC or DOCX and preview the finished PDF.', path: '/word-to-pdf', icon: FileText },
      { title: 'PDF to images', note: 'Export PDF pages as image files.', path: '/to-image', icon: FileImage },
      { title: 'Images to PDF', note: 'Combine photos and scans into an ordered PDF.', path: '/images-to-pdf', icon: Images },
      { title: 'OCR searchable PDF', note: 'Add searchable text to scanned PDF pages locally.', path: '/ocr-pdf', icon: ScanText },
      { title: 'Clean scanned PDF', note: 'Improve contrast and remove light scan backgrounds.', path: '/scan-cleanup', icon: FileSearch },
    ],
  },
  {
    title: 'Edit, fill and protect',
    description: 'Work directly on the page with visual, draggable objects.',
    tools: [
      { title: 'Visual PDF editor', note: 'Add text, images, shapes, highlights and drawings.', path: '/edit', icon: Highlighter },
      { title: 'Fill & sign PDF', note: 'Draw or type a signature and place it directly.', path: '/sign-pdf', icon: Signature },
      { title: 'Securely redact PDF', note: 'Permanently flatten covered content on selected pages.', path: '/redact-pdf', icon: ShieldX },
      { title: 'Crop and resize PDF', note: 'Drag a crop frame and fit pages to A4 or Letter.', path: '/crop-pdf', icon: Crop },
      { title: 'Compare PDF versions', note: 'Scan every page, find changes, and export a report.', path: '/compare-pdf', icon: Files },
      { title: 'PDF forms', note: 'Fill existing fields or place new fields visually.', path: '/pdf-forms', icon: FormInput },
      { title: 'Document information', note: 'Edit metadata and inspect bookmarks or attachments.', path: '/document-info', icon: Tags },
    ],
  },
  {
    title: 'Mark and clean',
    description: 'Add ownership marks or remove simple overlays.',
    tools: [
      { title: 'Add watermark', note: 'Apply text or image marks to pages.', path: '/watermark', icon: Stamp },
      { title: 'Remove watermark', note: 'Remove supported watermark layers.', path: '/unwatermark', icon: LockKeyhole },
    ],
  },
]

const commonRequirements = [
  { title: 'Make a scanned PDF smaller', text: 'Detect image-based pages, choose a suitable reduction mode, and verify handwriting and signatures.', path: '/compress/scanned' },
  { title: 'Compress a PDF for a 5 MB upload limit', text: 'Enter the exact maximum shown by the portal and verify the finished file size.', path: '/compress/exact' },
  { title: 'Check whether a thesis PDF has searchable text', text: 'Review text detection, page size, orientation and file size before university submission.', path: '/thesis-pdf-check' },
  { title: 'Combine passport and supporting document PDFs', text: 'Organize sensitive visa files into one ordered PDF or a clearly named ZIP package.', path: '/visa-prep' },
  { title: 'Reduce a PDF for an email attachment', text: 'Create the smallest practical copy without guessing which compression setting to use.', path: '/compress/exact' },
  { title: 'Extract selected pages from a PDF', text: 'Preview a document and create a new PDF containing only the pages you choose.', path: '/split' },
  { title: 'Convert a scanned PDF to editable Word text', text: 'Use browser-based OCR for scanned pages and direct extraction for text PDFs.', path: '/to-word' },
  { title: 'Turn a Word document into a shareable PDF', text: 'Choose a DOC or DOCX file, then review the finished PDF before downloading.', path: '/word-to-pdf' },
]

export default function AllToolsPage() {
  usePageTitle('/tools')
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredGroups = useMemo(() => groups.map((group) => ({
    ...group,
    tools: group.tools.filter((tool) => `${tool.title} ${tool.note} ${group.title}`.toLowerCase().includes(normalizedQuery)),
  })).filter((group) => group.tools.length > 0), [normalizedQuery])
  const resultCount = filteredGroups.reduce((total, group) => total + group.tools.length, 0)

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
      if (event.key === '/' || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  return (
    <div className="tools-directory">
      <section className="tools-directory-hero">
        <span className="lop-eyebrow"><FileCheck2 size={15} /> One toolkit, practical outcomes</span>
        <h1>Every PDF tool, organized by what you need to finish.</h1>
        <p>Choose a complete workflow for a real requirement, or open a focused utility for one specific task.</p>
        <div className="tools-search"><Search aria-hidden="true" /><input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by task, such as scan, sign, OCR or 5 MB…" aria-label="Search PDF tools" />{query ? <button type="button" aria-label="Clear tool search" onClick={() => { setQuery(''); searchRef.current?.focus() }}><X /></button> : <kbd>⌘ K</kbd>}</div>
        {normalizedQuery && <small className="tools-search-count">{resultCount} matching tool{resultCount === 1 ? '' : 's'}</small>}
      </section>

      <div className="tools-directory-groups">
        {filteredGroups.map((group) => (
          <section key={group.title} className="tools-directory-group">
            <div className="tools-directory-heading">
              <h2>{group.title}</h2>
              <p>{group.description}</p>
            </div>
            <div className="tools-directory-grid">
              {group.tools.map((tool) => {
                const Icon = tool.icon
                return (
                  <Link key={tool.path} to={tool.path} className="tools-directory-card">
                    <PdfToolIcon icon={Icon} label={tool.title} kind={pdfIconKindForPath(tool.path)} />
                    <div>
                      <h3>{tool.title}</h3>
                      <p>{tool.note}</p>
                    </div>
                    <ArrowRight className="tools-directory-arrow" />
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
        {normalizedQuery && filteredGroups.length === 0 && <div className="tools-search-empty"><Search /><h2>No matching tool yet</h2><p>Try a result such as compress, scan, sign, images, pages, or Word.</p><button type="button" className="btn-ghost" onClick={() => setQuery('')}>Show all tools</button></div>}
      </div>

      {!normalizedQuery && <section className="tools-use-cases">
        <div className="tools-directory-heading">
          <h2>Common PDF requirements</h2>
          <p>Direct answers for the document problems people usually need to solve.</p>
        </div>
        <div>
          {commonRequirements.map((item) => (
            <Link to={item.path} key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.text}</span>
              <ArrowRight />
            </Link>
          ))}
        </div>
      </section>}
    </div>
  )
}
