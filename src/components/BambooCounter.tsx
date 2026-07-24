import { useEffect, useState } from 'react'

const BAMBOO_STORAGE_KEY = 'panda-bamboo-count'

function getCount(): number {
  if (typeof window === 'undefined') return 2000
  try {
    return Number(localStorage.getItem(BAMBOO_STORAGE_KEY)) || 2000
  } catch {
    return 2000
  }
}

export function addBamboo(count: number = 1) {
  const current = getCount()
  const next = current + count
  try { localStorage.setItem(BAMBOO_STORAGE_KEY, String(next)) } catch {}
  window.dispatchEvent(new CustomEvent('bamboo-update', { detail: next }))
}

export default function BambooCounter() {
  const [count, setCount] = useState(getCount)
  const [rolling, setRolling] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setCount(detail)
    }
    window.addEventListener('bamboo-update', handler)
    return () => window.removeEventListener('bamboo-update', handler)
  }, [])

  // Animate roll on mount
  useEffect(() => {
    setRolling(true)
    const t = setTimeout(() => setRolling(false), 2000)
    return () => clearTimeout(t)
  }, [])

  const display = count.toLocaleString().split('').map((c, i) => (
    <span
      key={i}
      style={{
        display: 'inline-block',
        transition: 'transform 0.3s ease',
        transform: rolling ? 'translateY(0)' : 'translateY(0)',
        animation: rolling ? `rollIn 0.4s ease ${i * 0.06}s both` : 'none',
      }}
    >
      {c}
    </span>
  ))

  return (
    <div
      style={{
        position: 'fixed',
        left: '24px',
        top: '80px',
        zIndex: 40,
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(5, 150, 105, 0.2)',
          borderRadius: '20px',
          padding: '20px 24px',
          maxWidth: '280px',
          boxShadow: '0 4px 24px rgba(5, 150, 105, 0.06)',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(58, 90, 64, 0.45)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '2px' }}>
          Thank You
        </div>
        <div style={{ fontSize: '10px', color: 'rgba(76, 175, 80, 0.25)', letterSpacing: '3px', marginBottom: '10px' }}>
          People around the world feed me
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginBottom: '4px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(58,90,64,0.3)', letterSpacing: '2px', marginRight: '4px' }}>🎋</span>
          <span style={{ fontSize: '32px', fontWeight: 700, lineHeight: 1, color: '#2e7d32', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
            {display}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(58,90,64,0.35)', marginLeft: '4px' }}>bamboos</span>
        </div>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(76,175,80,0.2), transparent)', marginBottom: '6px' }} />

        <div style={{ fontSize: '9px', color: 'rgba(76, 175, 80, 0.2)', letterSpacing: '4px', textTransform: 'uppercase' }}>
          &amp; growing every day
        </div>
      </div>

      <style>{`
        @keyframes rollIn {
          0% { transform: translateY(-20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
