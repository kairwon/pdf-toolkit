import { ArrowLeft, FileQuestion } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import usePageTitle from '../hooks/usePageTitle'

export default function NotFoundPage() {
  const location = useLocation()
  // For coming-soon pages, still show a useful message
  const comingSoonPaths: Record<string, { title: string; desc: string }> = {
    '/edit-pdf': { title: 'Edit PDF Online', desc: 'Edit PDF files directly in your browser — delete, rotate, reorder, and extract pages.' },
    '/pdf-to-excel': { title: 'Convert PDF to Excel', desc: 'Convert PDF tables to Excel spreadsheets. Coming soon — no upload, browser-based conversion.' },
    '/sign-pdf': { title: 'Sign PDF Online', desc: 'Add electronic signatures to PDF documents. Coming soon — browser-based signing, no account needed.' },
    '/unlock-pdf': { title: 'Unlock PDF Online', desc: 'Remove PDF password protection. Coming soon — all processing happens in your browser.' },
  }
  const comingSoon = comingSoonPaths[location.pathname]
  usePageTitle(comingSoon ? location.pathname : '/404')

  if (comingSoon) {
    return (
      <div className="not-found">
        <FileQuestion size={34} />
        <span>COMING SOON</span>
        <h1>{comingSoon.title}</h1>
        <p>{comingSoon.desc}</p>
        <Link to="/tools" className="btn-primary" style={{ padding: '10px 24px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={14} /> Browse all PDF tools
        </Link>
      </div>
    )
  }

  return <div className="not-found"><FileQuestion size={34} /><span>404</span><h1>This PDF tool page does not exist</h1><p>Return to Lab of PDF and choose a working tool.</p><Link to="/tools"><ArrowLeft size={14} /> Browse PDF tools</Link></div>
}
