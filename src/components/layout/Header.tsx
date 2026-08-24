import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, Menu, ShieldCheck, X } from 'lucide-react'

const navGroups = [
  {
    label: 'Edit & sign',
    items: [
      { label: 'Visual PDF editor', path: '/edit' },
      { label: 'Fill & sign PDF', path: '/sign-pdf' },
      { label: 'Securely redact PDF', path: '/redact-pdf' },
      { label: 'Crop and resize', path: '/crop-pdf' },
      { label: 'PDF forms', path: '/pdf-forms' },
    ],
  },
  {
    label: 'Real-world tasks',
    items: [
      { label: 'Thesis PDF check', path: '/thesis-pdf-check' },
      { label: 'Visa application prep', path: '/visa-prep' },
      { label: 'Portal-ready PDF', path: '/portal-ready-pdf' },
    ],
  },
  {
    label: 'Organize',
    items: [
      { label: 'Merge PDFs', path: '/merge' },
      { label: 'Split PDF', path: '/split' },
      { label: 'Manage pages', path: '/manage' },
    ],
  },
  {
    label: 'Convert & compress',
    items: [
      { label: 'Compress PDF', path: '/compress' },
      { label: 'Compress to exact size', path: '/compress/exact' },
      { label: 'Compress scanned PDF', path: '/compress/scanned' },
      { label: 'PDF to Word', path: '/to-word' },
      { label: 'PDF to images', path: '/to-image' },
      { label: 'Images to PDF', path: '/images-to-pdf' },
      { label: 'OCR searchable PDF', path: '/ocr-pdf' },
      { label: 'Clean scanned PDF', path: '/scan-cleanup' },
    ],
  },
  {
    label: 'Protect',
    items: [
      { label: 'Add watermark', path: '/watermark' },
      { label: 'Remove watermark', path: '/unwatermark' },
      { label: 'Compare PDFs', path: '/compare-pdf' },
      { label: 'Document information', path: '/document-info' },
      { label: 'Reusable workflows', path: '/workflows' },
    ],
  },
]

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const closeMobile = () => setMobileOpen(false)

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="site-brand" onClick={closeMobile}>
          <span className="site-brand-mark"><img src="/logo-google.png" alt="" width="46" height="46" /></span>
          <span>
            <strong>Lab of PDF</strong>
            <small>Private tools for real documents</small>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div key={group.label} className="site-nav-group">
              <button type="button">
                {group.label}
                <ChevronDown size={15} />
              </button>
              <div className="site-nav-menu">
                {group.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={location.pathname === item.path ? 'is-active' : ''}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <Link to="/tools" className={location.pathname === '/tools' ? 'site-nav-link is-active' : 'site-nav-link'}>
            All tools
          </Link>
          <Link to="/privacy" className="site-privacy-link">
            <ShieldCheck size={16} />
            Private by design
          </Link>
        </nav>

        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
          className="site-menu-button"
        >
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="site-mobile-nav" aria-label="Mobile navigation">
          {navGroups.map((group) => (
            <div key={group.label}>
              <strong>{group.label}</strong>
              {group.items.map((item) => (
                <Link key={item.path} to={item.path} onClick={closeMobile}>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
          <Link to="/tools" onClick={closeMobile}>All tools</Link>
          <Link to="/privacy" onClick={closeMobile}>Privacy</Link>
        </nav>
      )}
    </header>
  )
}
