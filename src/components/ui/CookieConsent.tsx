import { useState, useEffect } from 'react'

const COOKIE_CONSENT_KEY = 'pdf-toolkit-cookie-consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const decided = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!decided) {
      // Delay showing so page renders first
      const t = setTimeout(() => setVisible(true), 500)
      return () => clearTimeout(t)
    }
  }, [])

  const accept = (level: 'all' | 'necessary') => {
    localStorage.setItem(COOKIE_CONSENT_KEY, level)
    setVisible(false)
    // If user accepted all, we could load AdSense here
    if (level === 'all') {
      // Placeholder for AdSense script load
      console.log('Ad consent granted')
    }
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4">
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(16px)',
        borderRadius: '20px',
        padding: '24px 28px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)',
        animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <div className="text-sm text-gray-600 leading-relaxed" style={{ marginBottom: '18px' }}>
          <strong className="text-gray-800" style={{ display: 'block', marginBottom: '6px' }}>
            🍪 We value your privacy
          </strong>
          This site may use cookies and similar technologies to improve your experience and serve personalized ads via Google AdSense.
          You can choose which cookies to allow.{' '}
          <a href="/privacy" className="underline text-jade hover:text-jade-dark" target="_blank" rel="noopener noreferrer">
            Learn more
          </a>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => accept('necessary')}
            className="btn-secondary text-sm flex-1 sm:flex-none"
          >
            Necessary only
          </button>
          <button
            onClick={() => accept('all')}
            style={{
              flex: '1 1 auto',
              padding: '10px 24px',
              borderRadius: '100px',
              border: 'none',
              background: 'linear-gradient(135deg, #4caf50, #2fa36b)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(47,163,107,0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            Accept all cookies
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
