import { useEffect } from 'react'
import { ArrowLeft, ChevronRight, Home } from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Header from './Header'
import DownloadOverlay from '../DownloadOverlay'
import CookieConsent from '../ui/CookieConsent'

export default function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const routeLabels: Record<string, string> = {
    '/tools': 'All PDF tools',
    '/merge': 'Merge PDF',
    '/split': 'Split PDF',
    '/manage': 'Manage PDF pages',
    '/edit-pdf': 'Manage PDF pages',
    '/to-image': 'PDF to images',
    '/images-to-pdf': 'Images to PDF',
    '/compress': 'Compress PDF',
    '/compress/visa': 'Visa PDF compressor',
    '/compress/exact': 'Compress to exact size',
    '/thesis-pdf-check': 'Thesis PDF check',
    '/watermark': 'Add watermark',
    '/unwatermark': 'Remove watermark',
    '/to-word': 'PDF to Word',
    '/visa-prep': 'Visa document pack',
    '/portal-ready-pdf': 'Portal-ready PDF',
    '/privacy': 'Privacy',
    '/terms': 'Terms',
    '/security': 'Security',
    '/guides': 'Guides',
    '/editorial-policy': 'Editorial policy',
    '/about/editorial-team': 'Authors and reviewers',
    '/guides/compress-pdf-for-university-upload': 'University PDF upload guide',
    '/guides/make-scanned-notes-searchable': 'Searchable notes guide',
    '/guides/organize-pdf-study-notes': 'PDF revision pack guide',
    '/guides/compress-pdf-without-losing-quality': 'Readable PDF compression guide',
    '/guides/reduce-scanned-pdf-file-size': 'Scanned PDF size guide',
    '/guides/pdf-submission-checklist': 'PDF submission checklist',
  }
  const toolPaths = new Set([
    '/merge', '/split', '/manage', '/to-image', '/images-to-pdf', '/compress',
    '/compress/visa', '/compress/exact', '/thesis-pdf-check', '/watermark',
    '/unwatermark', '/to-word', '/visa-prep', '/portal-ready-pdf',
  ])
  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [pathname])

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Header />
      <DownloadOverlay />
      <CookieConsent />
      <main className="site-main" id="main-content">
        {pathname !== '/' && (
          <nav className="site-breadcrumb" aria-label="Breadcrumb">
            <Link to="/" aria-label="Home"><Home /></Link>
            <ChevronRight />
            {toolPaths.has(pathname) && (
              <>
                <button type="button" className="site-back-link" onClick={goBack} aria-label="Go back to the previous page">
                  <ArrowLeft /> Previous page
                </button>
                <ChevronRight />
              </>
            )}
            <span aria-current="page">{routeLabels[pathname] || 'Page'}</span>
          </nav>
        )}
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <strong>Lab of PDF</strong>
            <p>Practical PDF help, processed locally in your browser whenever possible.</p>
          </div>
          <nav aria-label="Footer navigation">
            <Link to="/tools">All tools</Link>
            <Link to="/guides">Guides</Link>
            <Link to="/guides/pdf-submission-checklist">Submission checklist</Link>
            <Link to="/editorial-policy">How we review</Link>
            <Link to="/about/editorial-team">Authors</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/security">Security</Link>
            <button type="button" onClick={() => window.dispatchEvent(new Event('open-privacy-settings'))}>
              Privacy choices
            </button>
            <a href="mailto:labofpdf@gmail.com">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
