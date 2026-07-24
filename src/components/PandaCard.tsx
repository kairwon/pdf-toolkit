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
          Lottie.default.loadAnimation({ container, renderer: 'svg', loop: true, autoplay: true, animationData: data })
        })
        .catch(() => {})
    })
  }, [])

  return (
    <div className="mt-8" style={{ width: '100%', maxWidth: '1150px', margin: '24px auto' }}>
      <div style={{
        background: 'linear-gradient(180deg, #f8fbf9, #edf4ef)',
        borderRadius: '28px',
        padding: '30px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 25px 50px rgba(0,0,0,0.08)',
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}>

          {/* ─── LEFT (no bg, shares outer bg) ─── */}
          <div style={{
            flex: 1,
            position: 'relative',
            padding: '24px 28px',
            borderRadius: '26px',
            overflow: 'hidden',
          }}>
            {/* Subtle bamboo bg */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'url(https://img.freepik.com/free-vector/bamboo-background_23-2147505699.jpg) no-repeat left bottom',
              backgroundSize: '40%', opacity: 0.06, pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Panda Bamboo Forest · Grow Together
                <span style={{ marginLeft: '6px', background: '#eef2ef', borderRadius: '50%', padding: '2px 6px', fontSize: '11px' }}>?</span>
              </div>

              <div style={{ marginTop: '8px', color: '#6b7280', fontSize: '13px' }}>
                Thanks <span style={{ color: '#2fa36b', fontWeight: 600 }}>{friendCount.toLocaleString()}</span> contributors
              </div>

              {/* Digit cards */}
              <div style={{ margin: '14px 0', display: 'flex', flexWrap: 'nowrap', gap: '3px', whiteSpace: 'nowrap' }}>
                {bamboo.toLocaleString().split('').map((d, i) => (
                  <span key={i} style={{
                    display: 'inline-block',
                    padding: '8px 10px',
                    borderRadius: '12px',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(235,240,236,0.9))',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05), inset 0 -2px 4px rgba(255,255,255,0.8)',
                    color: d === ',' ? '#2fa36b' : '#1b5e20',
                    minWidth: d === ',' ? '12px' : '24px',
                    textAlign: 'center',
                  }}>
                    {d}
                  </span>
                ))}
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginLeft: '8px', alignSelf: 'center' }}>
                  bamboos
                </span>
              </div>

              <div style={{
                marginTop: '12px',
                padding: '12px 16px',
                borderRadius: '14px',
                background: 'rgba(240,250,245,0.9)',
                color: '#4a8f6a',
                fontSize: '13px',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
              }}>
                🌱 Complete one action to gain 1 bamboo
              </div>
            </div>
          </div>

          {/* ─── CENTER — Panda ─── */}

          {/* ─── RIGHT ─── */}
          <div style={{
            width: '280px',
            padding: '20px',
            borderRadius: '22px',
            background: '#ffffff',
            boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '50px', height: '50px', borderRadius: '50%',
                background: '#f2f5f3', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '26px',
              }}>
                🐼
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>HUA HUA</div>
                <div style={{
                  display: 'inline-block', marginTop: '4px',
                  background: '#e8f5ec', color: '#2fa36b',
                  padding: '4px 10px', borderRadius: '12px', fontSize: '12px',
                }}>
                  Lv.{info.level}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: '16px', height: '10px', borderRadius: '10px', background: '#edf1ee' }}>
              <div style={{ height: '100%', width: `${info.progress * 100}%`, borderRadius: '10px', background: 'linear-gradient(90deg, #6bd18c, #2fa36b)', transition: 'width 0.6s ease' }} />
            </div>

            <div style={{ marginTop: '10px', color: '#6b7280', fontSize: '13px' }}>
              <span style={{ color: '#2fa36b', fontWeight: 600 }}>{info.needed.toLocaleString()}</span> to next level ↑
            </div>

            <div style={{ margin: '16px 0', borderTop: '1px dashed #e3e7e5' }} />

            {/* Next Milestone */}
            <div style={{
              display: 'flex', gap: '12px', padding: '14px',
              borderRadius: '16px',
              background: 'linear-gradient(180deg, #f7f7f7, #f1f1f1)',
            }}>
              <div style={{ fontSize: '28px' }}>🎋</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>Next Milestone</div>
                <div style={{ marginTop: '4px', fontSize: '13px', color: '#666' }}>
                  Forest grows denser, pandas grow bigger
                </div>
                <div style={{ marginTop: '8px', fontWeight: 'bold', color: '#2fa36b', fontSize: '18px' }}>
                  🎁 {info.needed.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
