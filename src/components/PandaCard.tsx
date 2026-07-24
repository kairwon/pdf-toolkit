import { useEffect, useState } from 'react'

const BAMBOO_STORAGE_KEY = 'panda-bamboo-count'

function getCount(): number {
  if (typeof window === 'undefined') return 2000
  try { return Number(localStorage.getItem(BAMBOO_STORAGE_KEY)) || 2000 }
  catch { return 2000 }
}

function getLevel(bamboo: number): { level: number; current: number; next: number; progress: number; needed: number } {
  const level = Math.max(1, Math.floor(bamboo / 1000))
  const base = (level - 1) * 1000
  const current = bamboo - base
  const next = 1000
  const progress = current / next
  return { level, current, next, progress, needed: next - current }
}

export function addBamboo(count: number = 1) {
  const current = getCount()
  const next = current + count
  try { localStorage.setItem(BAMBOO_STORAGE_KEY, String(next)) } catch {}
  window.dispatchEvent(new CustomEvent('bamboo-update', { detail: next }))
}

function FlipDigit({ digit, prevDigit, isComma }: { digit: string; prevDigit: string; isComma?: boolean }) {
  const [flipping, setFlipping] = useState(false)

  useEffect(() => {
    if (digit !== prevDigit && !isComma) {
      setFlipping(true)
      const t = setTimeout(() => setFlipping(false), 400)
      return () => clearTimeout(t)
    }
  }, [digit, prevDigit, isComma])

  if (isComma) {
    return <span style={{ color: '#2e7d32', fontWeight: 700, fontSize: '20px', width: '8px', textAlign: 'center' }}>{digit}</span>
  }

  return (
    <span style={{ display: 'inline-block', perspective: '600px' }}>
      <span style={{
        display: 'inline-block',
        minWidth: '24px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #e8f5e9, #c8e6c9)',
        border: '1px solid rgba(76,175,80,0.15)',
        borderRadius: '6px',
        padding: '3px 4px',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 700,
        fontSize: '22px',
        color: '#1b5e20',
        lineHeight: 1.3,
        transform: flipping ? 'rotateX(90deg)' : 'rotateX(0)',
        transition: 'transform 0.35s ease',
        transformOrigin: '50% 50%',
      }}>
        {digit}
      </span>
    </span>
  )
}

function FlipNumber({ value }: { value: string }) {
  return (
    <span style={{ display: 'inline-flex', gap: '2px', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
      {value.split('').map((d, i) => (
        <FlipDigit key={`${i}-${d}`} digit={d} prevDigit={d} isComma={d === ','} />
      ))}
    </span>
  )
}

export default function PandaCard() {
  const [bamboo, setBamboo] = useState(getCount)
  const info = getLevel(bamboo)
  const friendCount = Math.floor(bamboo / 10) * 10 || 1280

  useEffect(() => {
    const handler = (e: Event) => setBamboo((e as CustomEvent).detail)
    window.addEventListener('bamboo-update', handler)
    return () => window.removeEventListener('bamboo-update', handler)
  }, [])

  useEffect(() => {
    import('lottie-web').then(Lottie => {
      fetch('/panda-sleep.json')
        .then(r => r.json())
        .then(data => {
          const container = document.getElementById('panda-card-lottie')
          if (!container) return
          Lottie.default.loadAnimation({
            container,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData: data,
          })
        })
        .catch(() => {})
    })
  }, [])

  const friendFormatted = friendCount.toLocaleString()

  return (
    <div className="mt-8">
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.25))',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(5, 150, 105, 0.15)',
        borderRadius: '24px',
        padding: '24px 28px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(76,175,80,0.06), transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -20, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(76,175,80,0.05), transparent)', pointerEvents: 'none' }} />

        <div className="flex items-center gap-6 sm:gap-10">

          {/* ─── LEFT COLUMN ─── */}
          <div className="flex-1 min-w-0" style={{ maxWidth: '380px' }}>
            {/* Title — always one line */}
            <div style={{ whiteSpace: 'nowrap', fontSize: '20px', fontWeight: 800, color: '#1b5e20', lineHeight: 1.2, marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Let's raise the panda together
            </div>

            {/* Thanks to */}
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(58,90,64,0.4)', marginBottom: '6px' }}>
              Thanks to
            </div>

            {/* 2,000 — forced single line, big */}
            <div style={{ whiteSpace: 'nowrap', marginBottom: '4px' }}>
              <FlipNumber value={friendFormatted} />
            </div>

            {/* friends from around the world — forced one line */}
            <div style={{ whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 500, color: 'rgba(58,90,64,0.4)', marginBottom: '14px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              friends from around the world
            </div>

            {/* 🎋 2,000 bamboos — forced single line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '18px' }}>🎋</span>
              <FlipNumber value={bamboo.toLocaleString()} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(58,90,64,0.35)', marginLeft: '2px' }}>bamboos</span>
            </div>

            {/* Bottom line — always one row */}
            <div style={{ whiteSpace: 'nowrap', fontSize: '11px', fontWeight: 600, color: '#2e7d32', letterSpacing: '1px' }}>
              Every conversion = 1 🎋 for the panda
            </div>
          </div>

          {/* ─── CENTER — Panda (bigger) ─── */}
          <div className="shrink-0" style={{ width: '200px', height: '200px', filter: 'drop-shadow(0 4px 20px rgba(76,175,80,0.12))' }}>
            <div id="panda-card-lottie" style={{ width: '100%', height: '100%' }} />
          </div>

          {/* ─── RIGHT COLUMN ─── */}
          <div className="flex-1 min-w-0" style={{ maxWidth: '280px' }}>
            {/* Name badge */}
            <div style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)',
              border: '1px solid rgba(76,175,80,0.15)',
              borderRadius: '10px',
              padding: '4px 14px',
              marginBottom: '12px',
              fontSize: '14px',
              fontWeight: 800,
              color: '#1b5e20',
              letterSpacing: '1px',
            }}>
              HUA HUA
            </div>

            {/* Level */}
            <div style={{ marginBottom: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#1b5e20', letterSpacing: '2px' }}>
                Lv.{info.level}
              </span>
            </div>

            {/* Progress bar — dynamic */}
            <div style={{ height: '8px', background: 'rgba(76,175,80,0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ height: '100%', width: `${info.progress * 100}%`, background: 'linear-gradient(90deg, #a5d6a7, #43a047)', borderRadius: '4px', transition: 'width 0.6s ease' }} />
            </div>

            {/* Next level */}
            <div style={{ textAlign: 'left', marginBottom: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#2e7d32', letterSpacing: '1px', textTransform: 'uppercase' }}>NEXT LEVEL</span>
            </div>
            <div style={{ textAlign: 'left', fontSize: '13px', fontWeight: 700, color: '#2e7d32' }}>
              🎋 {info.needed.toLocaleString()} needed
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes gentleWave {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}
