import { useState, useEffect } from 'react'

const COOKIE_CONSENT_KEY = 'pdf-toolkit-cookie-consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const decided = localStorage.getItem(COOKIE_CONSENT_KEY)
    let timer: number | undefined
    if (!decided) {
      timer = window.setTimeout(() => setVisible(true), 500)
    }
    const reopen = () => setVisible(true)
    window.addEventListener('open-privacy-settings', reopen)
    return () => {
      if (timer) window.clearTimeout(timer)
      window.removeEventListener('open-privacy-settings', reopen)
    }
  }, [])

  const accept = (level: 'all' | 'necessary') => {
    localStorage.setItem(COOKIE_CONSENT_KEY, level)
    setVisible(false)
    window.dispatchEvent(new CustomEvent('privacy-choice-changed', { detail: level }))
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
            Privacy choices
          </strong>
          Necessary browser storage remembers this choice and essential site preferences. Advertising and analytics scripts are currently disabled.
          If they are introduced, optional technologies will remain off unless you allow them.{' '}
          <a href="/privacy" className="underline text-jade hover:text-jade-dark" target="_blank" rel="noopener noreferrer">
            Learn more
          </a>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => accept('necessary')}
            className="btn-secondary text-sm flex-1 sm:flex-none"
          >
            Keep optional off
          </button>
          <button
            onClick={() => accept('all')}
            style={{
              flex: '1 1 auto',
              padding: '10px 24px',
              borderRadius: '100px',
              border: 'none',
              background: 'linear-gradient(135deg, #159669, #087f5b)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(8,127,91,0.28)',
              transition: 'all 0.2s ease',
            }}
          >
            Allow optional
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
