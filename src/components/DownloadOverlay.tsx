import { useEffect, useRef, useState } from 'react'

type OverlayData = {
  title: string
  onDownload: () => void
}

export function triggerDownloadOverlay(data: OverlayData) {
  window.dispatchEvent(new CustomEvent('show-download-overlay', { detail: data }))
}

export default function DownloadOverlay() {
  const [data, setData] = useState<OverlayData | null>(null)
  const [phase, setPhase] = useState<'loading' | 'download' | 'congrats'>('loading')
  const animRef = useRef<any>(null)
  const destroyedRef = useRef(false)
  const mountedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as OverlayData
      setData(detail)
      setPhase('loading')
      destroyedRef.current = false

      setTimeout(() => {
        if (!destroyedRef.current) {
          setPhase('download')
        }
      }, 3000)
    }
    window.addEventListener('show-download-overlay', handler)
    return () => window.removeEventListener('show-download-overlay', handler)
  }, [])

  useEffect(() => {
    if (!data) return
    destroyedRef.current = false
    let anim: any
    import('lottie-web').then(Lottie => {
      fetch('/meditating-panda.json')
        .then(r => r.json())
        .then(animData => {
          const container = mountedRef.current?.querySelector('#overlay-panda-lottie')
          if (!container || destroyedRef.current) return
          anim = Lottie.default.loadAnimation({ container, renderer: 'svg', loop: true, autoplay: true, animationData: animData })
          animRef.current = anim
        })
        .catch(() => {})
    })
    return () => {
      destroyedRef.current = true
      if (anim) anim.destroy()
    }
  }, [data])

  const close = () => {
    destroyedRef.current = true
    if (animRef.current) { animRef.current.destroy(); animRef.current = null }
    setData(null)
    setPhase('loading')
  }

  const handleGoFeed = () => {
    try { sessionStorage.setItem('panda-pending-feed', '1') } catch {}
    close()
    window.location.href = '/'
  }

  if (!data) return null

  return (
    <div ref={mountedRef} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(6px)',
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '28px',
        padding: '40px 50px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        boxShadow: '0 40px 80px rgba(0,0,0,0.2)',
        minWidth: '380px',
        maxWidth: '440px',
        animation: 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        position: 'relative',
      }}>
        <button
          onClick={close}
          style={{
            position: 'absolute', top: '14px', right: '18px',
            border: 'none', background: 'transparent',
            fontSize: '20px', color: '#999', cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          ✕
        </button>

        {/* Meditating Panda */}
        <div style={{
          width: phase === 'congrats' ? '120px' : '160px',
          height: phase === 'congrats' ? '120px' : '160px',
          transition: 'all 0.3s ease',
        }}>
          <div id="overlay-panda-lottie" style={{ width: '100%', height: '100%' }} />
        </div>

        {phase === 'loading' && (
          <>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#333', textAlign: 'center' }}>
              {data.title}
            </div>
            <div style={{ fontSize: '14px', color: '#999' }}>
              Processing...
            </div>
            <div style={{ width: '200px', height: '4px', borderRadius: '4px', background: '#edf1ee', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: '100%', borderRadius: '4px',
                background: 'linear-gradient(90deg, #6bd18c, #2fa36b)',
                animation: 'shrink 3s linear forwards',
              }} />
            </div>
          </>
        )}

        {phase === 'download' && (
          <>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#333', textAlign: 'center' }}>
              {data.title}
            </div>
            <button
              onClick={() => { data?.onDownload(); setPhase('congrats') }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #4caf50, #2fa36b)',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 15px rgba(47,163,107,0.35)',
              }}
            >
              ⬇ Download
            </button>
          </>
        )}

        {phase === 'congrats' && (
          <>
            <div style={{
              padding: '10px 20px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              animation: 'popIn 0.4s ease',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}>
              🎋 Congratulations! You earned <span style={{ color: '#ff9800', fontSize: '20px' }}>1</span> bamboo!
            </div>
            <div style={{ fontSize: '13px', color: '#888', marginTop: '-12px' }}>
              Please feed the panda on the homepage.
            </div>
            <button
              onClick={handleGoFeed}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '2px solid #2fa36b',
                background: '#fff',
                color: '#2fa36b',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              🎋 Go feed the panda
            </button>
          </>
        )}

        <style>{`
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes scaleIn { from { opacity: 0; transform: scale(0.8) } to { opacity: 1; transform: scale(1) } }
          @keyframes shrink { from { width: 100% } to { width: 0% } }
          @keyframes popIn { from { opacity: 0; transform: scale(0.5) } to { opacity: 1; transform: scale(1) } }
        `}</style>
      </div>
    </div>
  )
}
