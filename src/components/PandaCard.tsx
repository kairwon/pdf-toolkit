import { useEffect, useState, useCallback } from 'react'

const BAMBOO_KEY = 'panda-bamboo-count'
const FEEDER_KEY = 'panda-last-feeder'

function getBamboo(): number {
  if (typeof window === 'undefined') return 0
  try { return Number(localStorage.getItem(BAMBOO_KEY)) || 0 }
  catch { return 0 }
}

function getFeeder(): { flag: string; name: string } | null {
  try {
    const raw = localStorage.getItem(FEEDER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function addBamboo(count: number = 1) {
  const current = getBamboo()
  const next = current + count
  try { localStorage.setItem(BAMBOO_KEY, String(next)) } catch {}
  window.dispatchEvent(new CustomEvent('bamboo-update', { detail: next }))
}

function getDetectedCountry(): { flag: string; name: string } {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!tz || tz === 'UTC') return { flag: '🇺🇸', name: 'United States' }
    const map: Record<string, [string, string]> = {
      'Africa/Cairo': ['🇪🇬', 'Egypt'],
      'Africa/Casablanca': ['🇲🇦', 'Morocco'],
      'Africa/Harare': ['🇿🇼', 'Zimbabwe'],
      'Africa/Johannesburg': ['🇿🇦', 'South Africa'],
      'Africa/Lagos': ['🇳🇬', 'Nigeria'],
      'Africa/Nairobi': ['🇰🇪', 'Kenya'],
      'Africa/Tunis': ['🇹🇳', 'Tunisia'],
      'America/Argentina/Buenos_Aires': ['🇦🇷', 'Argentina'],
      'America/Bogota': ['🇨🇴', 'Colombia'],
      'America/Caracas': ['🇻🇪', 'Venezuela'],
      'America/Chicago': ['🇺🇸', 'United States'],
      'America/Denver': ['🇺🇸', 'United States'],
      'America/Edmonton': ['🇨🇦', 'Canada'],
      'America/Halifax': ['🇨🇦', 'Canada'],
      'America/Lima': ['🇵🇪', 'Peru'],
      'America/Los_Angeles': ['🇺🇸', 'United States'],
      'America/Mexico_City': ['🇲🇽', 'Mexico'],
      'America/New_York': ['🇺🇸', 'United States'],
      'America/Phoenix': ['🇺🇸', 'United States'],
      'America/Santiago': ['🇨🇱', 'Chile'],
      'America/Sao_Paulo': ['🇧🇷', 'Brazil'],
      'America/Toronto': ['🇨🇦', 'Canada'],
      'America/Vancouver': ['🇨🇦', 'Canada'],
      'Asia/Bangkok': ['🇹🇭', 'Thailand'],
      'Asia/Dubai': ['🇦🇪', 'UAE'],
      'Asia/Ho_Chi_Minh': ['🇻🇳', 'Vietnam'],
      'Asia/Hong_Kong': ['🇭🇰', 'Hong Kong'],
      'Asia/Jakarta': ['🇮🇩', 'Indonesia'],
      'Asia/Kolkata': ['🇮🇳', 'India'],
      'Asia/Kuala_Lumpur': ['🇲🇾', 'Malaysia'],
      'Asia/Manila': ['🇵🇭', 'Philippines'],
      'Asia/Seoul': ['🇰🇷', 'South Korea'],
      'Asia/Shanghai': ['🇨🇳', 'China'],
      'Asia/Singapore': ['🇸🇬', 'Singapore'],
      'Asia/Taipei': ['🇹🇼', 'Taiwan'],
      'Asia/Tokyo': ['🇯🇵', 'Japan'],
      'Australia/Melbourne': ['🇦🇺', 'Australia'],
      'Australia/Perth': ['🇦🇺', 'Australia'],
      'Australia/Sydney': ['🇦🇺', 'Australia'],
      'Europe/Amsterdam': ['🇳🇱', 'Netherlands'],
      'Europe/Berlin': ['🇩🇪', 'Germany'],
      'Europe/Brussels': ['🇧🇪', 'Belgium'],
      'Europe/Copenhagen': ['🇩🇰', 'Denmark'],
      'Europe/Dublin': ['🇮🇪', 'Ireland'],
      'Europe/Helsinki': ['🇫🇮', 'Finland'],
      'Europe/Istanbul': ['🇹🇷', 'Turkey'],
      'Europe/Lisbon': ['🇵🇹', 'Portugal'],
      'Europe/London': ['🇬🇧', 'United Kingdom'],
      'Europe/Madrid': ['🇪🇸', 'Spain'],
      'Europe/Moscow': ['🇷🇺', 'Russia'],
      'Europe/Oslo': ['🇳🇴', 'Norway'],
      'Europe/Paris': ['🇫🇷', 'France'],
      'Europe/Prague': ['🇨🇿', 'Czech Republic'],
      'Europe/Rome': ['🇮🇹', 'Italy'],
      'Europe/Stockholm': ['🇸🇪', 'Sweden'],
      'Europe/Vienna': ['🇦🇹', 'Austria'],
      'Europe/Warsaw': ['🇵🇱', 'Poland'],
      'Europe/Zurich': ['🇨🇭', 'Switzerland'],
      'Pacific/Auckland': ['🇳🇿', 'New Zealand'],
      'Pacific/Honolulu': ['🇺🇸', 'United States'],
    }
    if (map[tz]) return { flag: map[tz][0], name: map[tz][1] }
    const parts = tz.split('/')
    if (parts.length >= 2) {
      const regionMap: Record<string, [string, string]> = {
        'Africa': ['🌍', 'Africa'],
        'America': ['🌎', 'Americas'],
        'Antarctica': ['🧊', 'Antarctica'],
        'Asia': ['🌏', 'Asia'],
        'Atlantic': ['🌎', 'Atlantic'],
        'Australia': ['🇦🇺', 'Australia'],
        'Europe': ['🌍', 'Europe'],
        'Indian': ['🌏', 'Indian Ocean'],
        'Pacific': ['🌏', 'Pacific'],
      }
      if (regionMap[parts[0]]) return regionMap[parts[0]]
    }
  } catch {}
  return { flag: '🇺🇸', name: 'United States' }
}

function getLevelInfo(bamboo: number) {
  const thresholds = [1000, 2000, 4000, 7000, 11000]
  for (let i = thresholds.length; ; i++) {
    const next = thresholds[i - 1] + i * 1000
    thresholds.push(next)
    if (next > bamboo + 100000) break
  }

  let level = 1
  for (const t of thresholds) {
    if (bamboo < t) {
      const prev = level === 1 ? 0 : thresholds[level - 2]
      return {
        level,
        progress: (bamboo - prev) / (t - prev),
        needed: t - bamboo,
        current: bamboo - prev,
        nextMilestone: thresholds[level] || thresholds[thresholds.length - 1],
      }
    }
    level++
  }
  return { level: 99, progress: 0, needed: 0, nextMilestone: thresholds[thresholds.length - 1], current: 0 }
}

export default function PandaCard() {
  const [bamboo, setBamboo] = useState(getBamboo)
  const info = getLevelInfo(bamboo)
  const [visitorCount, setVisitorCount] = useState(50)
  const [lastFeeder, setLastFeeder] = useState<{ flag: string; name: string } | null>(getFeeder() || getDetectedCountry())
  const [pendingFeed, setPendingFeed] = useState(false)
  const [feedDone, setFeedDone] = useState(false)

  useEffect(() => {
    const counted = sessionStorage.getItem('panda-visitor-counted')
    if (!counted) sessionStorage.setItem('panda-visitor-counted', '1')

    const endpoint = counted
      ? 'https://api.countapi.xyz/get/labofpdf.com/visitors'
      : 'https://api.countapi.xyz/hit/labofpdf.com/visitors'

    fetch(endpoint)
      .then(r => r.json())
      .then(data => { if (data?.value) setVisitorCount(data.value) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: Event) => setBamboo((e as CustomEvent).detail)
    window.addEventListener('bamboo-update', handler)
    return () => window.removeEventListener('bamboo-update', handler)
  }, [])

  useEffect(() => {
    const handler = () => {
      const f = getFeeder()
      setLastFeeder(f)
    }
    window.addEventListener('feeder-update', handler)
    return () => window.removeEventListener('feeder-update', handler)
  }, [])

  // Check if user came from download page
  useEffect(() => {
    try {
      if (sessionStorage.getItem('panda-pending-feed') === '1') {
        setPendingFeed(true)
        sessionStorage.removeItem('panda-pending-feed')
      }
    } catch {}
  }, [])

  useEffect(() => {
    let anim: any
    let destroyed = false
    import('lottie-web').then(Lottie => {
      fetch('/panda-sleep.json')
        .then(r => r.json())
        .then(data => {
          const container = document.getElementById('panda-card-lottie')
          if (!container || destroyed) return
          anim = Lottie.default.loadAnimation({ container, renderer: 'svg', loop: true, autoplay: true, animationData: data })
        })
        .catch(() => {})
    })
    return () => {
      destroyed = true
      if (anim) anim.destroy()
    }
  }, [])

  const handleFeed = useCallback(() => {
    addBamboo(1)
    const country = getDetectedCountry()
    setLastFeeder(country)
    try { localStorage.setItem(FEEDER_KEY, JSON.stringify(country)) } catch {}
    window.dispatchEvent(new Event('feeder-update'))
    setPendingFeed(false)
    setFeedDone(true)
    setTimeout(() => setFeedDone(false), 2000)
  }, [])

  const bambooDigits = bamboo.toLocaleString().split('')

  return (
    <div className="mt-8" style={{ width: '100%', maxWidth: '1150px', margin: '24px auto' }}>
      <div style={{
        background: 'linear-gradient(180deg, #f8fbf9, #edf4ef)',
        borderRadius: '28px',
        padding: '30px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 25px 50px rgba(0,0,0,0.08)',
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch', flexWrap: 'nowrap' }}>

          {/* ─── LEFT ─── */}
          <div style={{
            flex: '3 1 0',
            minWidth: 0,
            position: 'relative',
            padding: '24px 28px',
            borderRadius: '26px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Panda Bamboo Forest · Grow Together
              </div>

              <div style={{ marginTop: '10px', fontSize: '15px' }}>
                👋 <span style={{ color: '#1b5e20', fontWeight: 700 }}>{visitorCount.toLocaleString()}</span> visitors
              </div>

              <div style={{ margin: '14px 0', display: 'flex', flexWrap: 'nowrap', gap: '3px', whiteSpace: 'nowrap' }}>
                {bambooDigits.map((d, i) => (
                  <span key={i} style={{
                    display: 'inline-block',
                    padding: '8px 10px',
                    borderRadius: '12px',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    background: 'linear-gradient(180deg, rgba(200,230,200,0.95), rgba(160,200,160,0.95))',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.08), inset 0 -2px 4px rgba(255,255,255,0.6)',
                    color: d === ',' ? '#2fa36b' : '#1b5e20',
                    minWidth: d === ',' ? '12px' : '24px',
                    textAlign: 'center',
                  }}>
                    {d}
                  </span>
                ))}
                <span style={{ fontSize: '16px', marginLeft: '8px', alignSelf: 'center' }}>🎋</span>
              </div>

              <div style={{ marginTop: '4px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                🌱 Earn 1 bamboo per tool use
              </div>
            </div>

            {/* Last feeder — bottom of left column */}
            <div style={{ marginTop: '24px', fontSize: '13px', color: '#6b7280', minHeight: '20px', whiteSpace: 'nowrap' }}>
              🐼 Thanks {lastFeeder?.flag ?? '🇺🇸'} {lastFeeder?.name ?? 'United States'} for feeding the panda 🎋
            </div>
          </div>

          {/* ─── CENTER — Panda Lottie + Feed ─── */}
          <div style={{
            flex: '2.5 1 0',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '10px 0',
          }}>
            <div id="panda-card-lottie" style={{ width: 'min(260px, 100%)', height: 'min(260px, 26vw)' }} />

            {/* Feed button — only shows when user came from download */}
            {(pendingFeed || feedDone) && (
              <button
                onClick={handleFeed}
                disabled={feedDone}
                style={{
                  padding: '10px 28px',
                  borderRadius: '100px',
                  border: 'none',
                  background: feedDone
                    ? 'linear-gradient(135deg, #ffb74d, #ff9800)'
                    : 'linear-gradient(135deg, #4caf50, #2fa36b)',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: feedDone ? 'default' : 'pointer',
                  boxShadow: feedDone
                    ? '0 4px 20px rgba(255,152,0,0.5)'
                    : '0 4px 15px rgba(47,163,107,0.35)',
                  transform: feedDone ? 'scale(1.08)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                  animation: feedDone ? 'none' : 'popIn 0.5s ease',
                }}
              >
                {feedDone ? '🎋 已喂！' : '🎋 喂熊猫 Feed'}
              </button>
            )}
          </div>

          {/* ─── RIGHT ─── */}
          <div style={{
            flex: '2 1 0',
            minWidth: 0,
            padding: '20px',
            borderRadius: '22px',
            background: '#ffffff',
            boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
          }}>
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

            <div style={{ marginTop: '16px', height: '10px', borderRadius: '10px', background: '#edf1ee', position: 'relative' }}>
              <div style={{
                height: '100%', width: `${Math.min(Math.max(info.progress * 100, 0), 100)}%`,
                borderRadius: '10px',
                background: 'linear-gradient(90deg, #6bd18c, #2fa36b)',
                transition: 'width 0.6s ease',
              }} />
            </div>

            <div style={{ marginTop: '10px', color: '#6b7280', fontSize: '13px' }}>
              <span style={{ color: '#2fa36b', fontWeight: 600 }}>{info.needed.toLocaleString()}</span> 🎋 to next level
            </div>

            <div style={{ margin: '16px 0', borderTop: '1px dashed #e3e7e5' }} />

            <div style={{
              display: 'flex', gap: '12px', padding: '14px',
              borderRadius: '16px',
              background: 'linear-gradient(180deg, #f7f7f7, #f1f1f1)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>Next Milestone</div>
                <div style={{ marginTop: '4px', fontSize: '13px', color: '#666' }}>
                  Level {info.level + 1}
                </div>
                <div style={{ marginTop: '8px', fontWeight: 'bold', color: '#2fa36b', fontSize: '18px' }}>
                  🎋 {info.nextMilestone.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
