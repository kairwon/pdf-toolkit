import { useEffect, useState } from 'react'

const BAMBOO_STORAGE_KEY = 'panda-bamboo-count'

function getCount(): number {
  if (typeof window === 'undefined') return 2000
  try { return Number(localStorage.getItem(BAMBOO_STORAGE_KEY)) || 2000 }
  catch { return 2000 }
}

function getLevel(bamboo: number): { level: number; current: number; next: number; progress: number } {
  const level = Math.floor(bamboo / 1000) || 1
  const current = bamboo % 1000
  return { level, current, next: 1000, progress: current / 1000 }
}

export function addBamboo(count: number = 1) {
  const current = getCount()
  const next = current + count
  try { localStorage.setItem(BAMBOO_STORAGE_KEY, String(next)) } catch {}
  window.dispatchEvent(new CustomEvent('bamboo-update', { detail: next }))
}

export default function PandaCard() {
  const [bamboo, setBamboo] = useState(getCount)
  const info = getLevel(bamboo)

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
        {/* Subtle leaf accents */}
        <div style={{ position: 'absolute', top: -30, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(76,175,80,0.06), transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -20, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(76,175,80,0.05), transparent)', pointerEvents: 'none' }} />

        <div className="flex items-center gap-6 sm:gap-10">

          {/* LEFT — Together we grow */}
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1b5e20', lineHeight: 1.2, marginBottom: '6px' }}>
              Let's raise the panda together <span style={{ display: 'inline-block', animation: 'gentleWave 1.5s ease-in-out infinite' }}>🐼</span>
            </div>

            <div style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(58,90,64,0.4)', letterSpacing: '0.3px', marginBottom: '10px' }}>
              Thanks to <strong style={{ color: '#2e7d32' }}>{bamboo.toLocaleString()}</strong> friends from around the world
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px' }}>🎋</span>
              <span className="text-[30px] font-extrabold tabular-nums" style={{ color: '#1b5e20', lineHeight: 1 }}>
                {bamboo.toLocaleString()}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(58,90,64,0.35)' }}>
                bamboos
              </span>
            </div>

            <div style={{ fontSize: '10px', color: 'rgba(76,175,80,0.25)', letterSpacing: '2px' }}>
              Every conversion = 1 🎋 for the panda
            </div>
          </div>

          {/* CENTER — Panda */}
          <div className="shrink-0" style={{ width: '170px', height: '170px', filter: 'drop-shadow(0 4px 20px rgba(76,175,80,0.12))' }}>
            <div id="panda-card-lottie" style={{ width: '100%', height: '100%' }} />
          </div>

          {/* RIGHT — Level card */}
          <div className="flex-1 min-w-0">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#2e7d32' }}>
                Level
              </span>
              <span style={{ fontSize: '16px' }}>⬆</span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '36px', fontWeight: 800, color: '#1b5e20', lineHeight: 1, letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
                {info.level}
              </span>
            </div>

            <div style={{ textAlign: 'right', marginTop: '4px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(58,90,64,0.3)' }}>
                <span style={{ fontWeight: 600, color: '#2e7d32' }}>{info.current}</span> / {info.next} 🎋
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(76,175,80,0.2)', marginTop: '1px' }}>
                {info.next - info.current} to next level
              </div>
            </div>

            {/* Feed button */}
            <div style={{ textAlign: 'right', marginTop: '10px' }}>
              <button style={{
                padding: '6px 18px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                border: '1.5px solid rgba(76,175,80,0.2)',
                background: 'linear-gradient(135deg, #43a047, #2e7d32)',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(46,125,50,0.15)',
                letterSpacing: '0.5px',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(46,125,50,0.25)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(46,125,50,0.15)' }}
              >
                🎋 Feed the Panda
              </button>
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
