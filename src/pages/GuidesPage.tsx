import { ArrowRight, BookOpenCheck, ClipboardCheck, FileDown, Files, ScanText } from 'lucide-react'
import { Link } from 'react-router-dom'
import usePageTitle from '../hooks/usePageTitle'

const guides = [
  { icon: FileDown, href: '/guides/compress-pdf-for-university-upload', label: 'UNIVERSITY UPLOADS', title: 'How to reduce a PDF for a university submission portal', text: 'A practical sequence for meeting an exact MB limit without sacrificing readable text or submitting the wrong file.' },
  { icon: ScanText, href: '/guides/make-scanned-notes-searchable', label: 'SCANNED NOTES', title: 'Make scanned lecture notes searchable for faster revision', text: 'Use OCR carefully, verify recognition errors, and turn a folder of scans into notes you can actually search.' },
  { icon: Files, href: '/guides/organize-pdf-study-notes', label: 'EXAM REVISION', title: 'Organize PDF study notes into one useful revision pack', text: 'Remove duplicate pages, arrange topics, add a predictable order, and create a smaller master PDF.' },
  { icon: FileDown, href: '/guides/compress-pdf-without-losing-quality', label: 'READABLE COMPRESSION', title: 'Compress a PDF without making it unreadable', text: 'Find what makes the document large, reduce it deliberately, and inspect the downloaded copy before sending or submitting it.' },
  { icon: ScanText, href: '/guides/reduce-scanned-pdf-file-size', label: 'LARGE SCANS', title: 'Reduce a scanned PDF file size', text: 'Clean the scan, choose reduction based on its content, and protect small print, handwriting, stamps and signatures.' },
  { icon: ClipboardCheck, href: '/guides/pdf-submission-checklist', label: 'BEFORE YOU UPLOAD', title: 'PDF submission checklist: 10 checks before upload', text: 'Print or download a neutral checklist for file size, page order, readability, signatures, filenames, and portal confirmation.' },
]

export default function GuidesPage() {
  usePageTitle('/guides')
  return (
    <div className="guides-page">
      <header className="guides-hero">
        <span><BookOpenCheck /> PRACTICAL PDF GUIDES</span>
        <h1>Finish the document task, not just the file conversion</h1>
        <p>Step-by-step guidance for university uploads, scanned study notes and exam revision packs. Every guide connects to a tool you can use privately in your browser.</p>
      </header>
      <section className="guide-grid" aria-label="PDF guides">
        {guides.map(({ icon: Icon, href, label, title, text }) => (
          <article key={href}>
            <div className="guide-icon"><Icon /></div>
            <span>{label}</span>
            <h2>{title}</h2>
            <p>{text}</p>
            <Link to={href}>Read the guide <ArrowRight /></Link>
          </article>
        ))}
      </section>
      <section className="guide-trust-strip">
        <div><strong>Written for real constraints</strong><span>Exact upload limits, messy scans and last-minute submission checks.</span></div>
        <div><strong>No invented expertise</strong><span>Authored by the Lab of PDF editorial team and reviewed against the product.</span></div>
        <div><strong>Clear correction path</strong><span>Each guide shows its update date and links to our review method.</span></div>
      </section>
    </div>
  )
}
