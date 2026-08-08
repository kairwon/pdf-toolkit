import { useEffect, useState, useCallback, useRef } from 'react'

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
      if (regionMap[parts[0]]) return { flag: regionMap[parts[0]][0], name: regionMap[parts[0]][1] }
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

  const API = window.location.hostname === 'localhost' ? '' : 'https://labofpdf.com'

export default function PandaCard() {
  const sleepAnimationRef = useRef<any>(null)
  const previewAnimation = import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get('panda-preview')
    : null
  const [bamboo, setBamboo] = useState<number | null>(null)
  const info = getLevelInfo(bamboo ?? 0)
  const [visitorCount, setVisitorCount] = useState<number | null>(null)
  const [lastFeeder, setLastFeeder] = useState<{ flag: string; name: string } | null>(getFeeder() || getDetectedCountry())
  const [pendingFeed, setPendingFeed] = useState(false)
  const [hoverAwake, setHoverAwake] = useState(false)
  const [feedDone, setFeedDone] = useState(() => Boolean(previewAnimation))
  const sleepCal = { x: -48, y: -45, scale: 88 }
  const awakeCal = { x: -50, y: -46.5, scale: 79.5 }
  const thanksCal = { x: -49, y: -45.5, scale: 83 }

  useEffect(() => {
    const counted = sessionStorage.getItem('panda-visitor-counted')
    if (!counted) sessionStorage.setItem('panda-visitor-counted', '1')
    fetch(API + '/api/' + (counted ? 'visitors/get' : 'visitors/hit'))
      .then(r => r.json()).then(data => { if (data?.value) setVisitorCount(data.value) }).catch(() => {})
    fetch(API + '/api/bamboo/get')
      .then(r => r.json()).then(data => { if (data?.value) setBamboo(data.value) }).catch(() => {})
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
      if (sessionStorage.getItem('panda-feed-celebrate') === '1') {
        setFeedDone(true)
        sessionStorage.removeItem('panda-feed-celebrate')
        const country = getDetectedCountry()
        setLastFeeder(country)
        localStorage.setItem(FEEDER_KEY, JSON.stringify(country))
        window.setTimeout(() => document.getElementById('panda-habitat')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 180)
        return
      }
      if (sessionStorage.getItem('panda-pending-feed') === '1') {
        setPendingFeed(true)
        sessionStorage.removeItem('panda-pending-feed')
        window.setTimeout(() => document.getElementById('panda-habitat')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 180)
      }
    } catch {}
  }, [])

  useEffect(() => {
    let animSleep: any
    let destroyed = false
    import('lottie-web').then(Lottie => {
      fetch('/panda-sleep.json')
        .then(r => r.json())
        .then(data => {
          const c = document.getElementById('panda-card-lottie-sleep')
          if (!c || destroyed) return
          animSleep = Lottie.default.loadAnimation({ container: c, renderer: 'svg', autoplay: true, loop: true, animationData: data })
          sleepAnimationRef.current = animSleep
        })
        .catch(() => {})
    })
    return () => {
      destroyed = true
      if (sleepAnimationRef.current === animSleep) sleepAnimationRef.current = null
      if (animSleep) animSleep.destroy()
    }
  }, [])

  useEffect(() => {
    if (!hoverAwake || feedDone || previewAnimation) return
    let animation: any
    let destroyed = false
    import('lottie-web').then(Lottie => {
      fetch('/panda-awake.json?v=2')
        .then(r => r.json())
        .then(data => {
          const container = document.getElementById('panda-card-lottie-awake')
          if (!container || destroyed) return
          container.innerHTML = ''
          animation = Lottie.default.loadAnimation({
            container,
            renderer: 'svg',
            autoplay: false,
            loop: false,
            animationData: data,
          })
          animation.playSegments([0, 40], false)
        })
        .catch(() => {})
    })
    return () => {
      destroyed = true
      if (animation) animation.destroy()
    }
  }, [hoverAwake, feedDone, previewAnimation])

  // When feedDone becomes true, load and play big panda once, then switch back
  useEffect(() => {
    if (!feedDone) return
    let destroyed = false
    let playedOnce = false
    import('lottie-web').then(Lottie => {
      fetch(previewAnimation ? `/panda-${previewAnimation}.json` : '/panda.json')
        .then(r => r.json())
        .then(data => {
          const c = document.getElementById('panda-card-lottie-big')
          if (!c || destroyed) return
          c.innerHTML = ''
          const a = Lottie.default.loadAnimation({ container: c, renderer: 'svg', autoplay: false, loop: false, animationData: data })
          if (previewAnimation) {
            a.loop = true
            a.play()
            return
          }
          a.playSegments([180, data.op - 1], true)
          a.addEventListener('complete', () => {
            if (!destroyed && !playedOnce) {
              playedOnce = true
              setFeedDone(false)
            }
          })
        })
        .catch(() => { if (!destroyed) setFeedDone(false) })
    })
    return () => { destroyed = true }
  }, [feedDone, previewAnimation])

  const handleFeed = useCallback(() => {
    fetch(API + '/api/bamboo/feed')
      .then(r => r.json())
      .then(data => { if (data?.value) { setBamboo(data.value); window.dispatchEvent(new CustomEvent('bamboo-update', { detail: data.value })) } })
      .catch(() => {})
    const country = getDetectedCountry()
    setLastFeeder(country)
    try { localStorage.setItem(FEEDER_KEY, JSON.stringify(country)) } catch {}
    window.dispatchEvent(new Event('feeder-update'))
    setPendingFeed(false)
    const sleepAnimation = sleepAnimationRef.current
    if (sleepAnimation) {
      sleepAnimation.loop = false
      const finishTransition = () => {
        sleepAnimation.removeEventListener('complete', finishTransition)
        setFeedDone(true)
      }
      sleepAnimation.addEventListener('complete', finishTransition)
      sleepAnimation.playSegments([
        Math.max(0, Math.floor(sleepAnimation.currentFrame)),
        Math.max(1, Math.floor(sleepAnimation.totalFrames - 1)),
      ], true)
    } else {
      setFeedDone(true)
    }
  }, [API])

  const bambooDigits = (bamboo ?? 0).toLocaleString().split('')

  return (
    <div id="panda-habitat" className="mt-8 panda-habitat" style={{ width: '100%', maxWidth: '960px', margin: '24px auto' }}>
      <div className="panda-shell" style={{
        background: 'linear-gradient(180deg, #f8fbf9, #edf4ef)',
        borderRadius: '28px',
        padding: '24px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 25px 50px rgba(0,0,0,0.08)',
      }}>
        <div className="panda-shell-header">
          <div>
            <span>PANDA HABITAT</span>
            <strong>A small reward for finishing the job</strong>
          </div>
          <div className="bamboo-rule">
            <span className="bamboo-mark" aria-hidden="true"><i /><i /><i /></span>
            <span>1 completed tool = 1 bamboo</span>
          </div>
        </div>
        <div className="panda-stage">

          {/* ─── LEFT ─── */}
          <div className="panda-story" style={{
            minWidth: 0,
            position: 'relative',
            padding: '20px 24px',
            borderRadius: '26px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="panda-story-kicker">COMMUNITY BAMBOO</div>
              <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Help Hua Hua grow
              </div>
              <p className="panda-story-copy">Finish a PDF task, earn a bamboo, and come back to feed the panda.</p>

              <div style={{
                marginTop: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                {visitorCount !== null && (
                  <div className="panda-visitor-pill">
                    <span className="panda-visitor-dot" aria-hidden="true" />
                    <span><strong>{visitorCount.toLocaleString()}</strong> visitors joined</span>
                  </div>
                )}
                <div className="panda-bamboo-counter">
                  <div className="panda-counter-caption">BAMBOO COLLECTED</div>
                  <div className="panda-counter-row">
                    <span className="panda-counter-digits">
                    {bambooDigits.map((d, i) => (
                      <span key={i} className={d === ',' ? 'separator' : ''}>
                        {d}
                      </span>
                    ))}
                    </span>
                    <span className="bamboo-tally" aria-label="bamboo">
                      <i className="bamboo-leaf bamboo-leaf-left" />
                      <i className="bamboo-node bamboo-node-one" />
                      <i className="bamboo-node bamboo-node-two" />
                      <i className="bamboo-leaf bamboo-leaf-right" />
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '4px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                🌱 Earn 1 bamboo per tool use
              </div>
            </div>

            {/* Last feeder — bottom of left column */}
            <div style={{ marginTop: '24px', fontSize: '13px', color: '#6b7280', minHeight: '20px', lineHeight: 1.45 }}>
              🐼 Thanks {lastFeeder?.flag ?? '🇺🇸'} {lastFeeder?.name ?? 'United States'} for feeding the panda 🎋
            </div>
          </div>

          {/* ─── CENTER — Panda Lottie + Feed ─── */}
          <div className="panda-hero" style={{
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
          }}
            onPointerEnter={() => setHoverAwake(true)}
            onPointerLeave={() => setHoverAwake(false)}
          >
            <div className="panda-hero-title">
              <span>THE BAMBOO PAVILION</span>
              <strong>A quiet moment with Hua Hua</strong>
            </div>
            <div id="panda-card-lottie" style={{
              width: 'min(280px, 100%)',
              height: '260px',
              marginTop: '0',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {/* Sleep panda */}
              <div className="panda-animation-layer panda-animation-sleep" style={{
                position: 'absolute',
                width: `${sleepCal.scale}%`,
                height: `${sleepCal.scale}%`,
                transform: `translate(${sleepCal.x}%, ${sleepCal.y}%)`,
                opacity: (feedDone || hoverAwake ? 0 : 1),
                transition: 'opacity 0.4s',
                pointerEvents: 'none',
              }}>
                <div id="panda-card-lottie-sleep" style={{ width: '100%', height: '100%' }} />
              </div>
              <div className="panda-animation-layer panda-animation-awake" style={{
                position: 'absolute',
                width: `${awakeCal.scale}%`,
                height: `${awakeCal.scale}%`,
                transform: `translate(${awakeCal.x}%, ${awakeCal.y}%)`,
                opacity: (hoverAwake && !feedDone && !previewAnimation ? 1 : 0),
                transition: 'opacity 0.18s',
                pointerEvents: 'none',
              }}>
                <div id="panda-card-lottie-awake" style={{ width: '100%', height: '100%' }} />
              </div>
              {/* Big panda (thanks) */}
              <div className="panda-animation-layer panda-animation-thanks" style={{
                position: 'absolute',
                width: `${thanksCal.scale}%`,
                height: `${thanksCal.scale}%`,
                transform: `translate(${thanksCal.x}%, ${thanksCal.y}%)`,
                opacity: (feedDone ? 1 : 0),
                transition: 'opacity 0.4s',
                pointerEvents: 'none',
              }}>
                <div id="panda-card-lottie-big" style={{ width: '100%', height: '100%' }} />
              </div>
            </div>

            {/* Feed button */}
            {(pendingFeed || feedDone) && (
              <div style={{
                position: 'absolute',
                bottom: '14px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                zIndex: 10,
                pointerEvents: 'none',
              }}>
                <div style={{ pointerEvents: 'auto' }}>
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
                    {feedDone ? '🎋 Fed!' : '🎋 Feed the panda'}
                  </button>
                </div>

                {feedDone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', animation: 'popIn 0.4s ease', pointerEvents: 'auto' }}>
                    <span style={{ fontSize: '12px', color: '#999' }}>Share</span>
                    <button
                      onClick={() => {
                        const url = 'https://labofpdf.com'
                        const text = `🐼 I just fed Hua Hua the panda on Lab of PDF! Help raise the panda 🎋`
                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer,width=600,height=500')
                      }}
                      title="Share on X"
                      style={{
                        width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #e3e7e5',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: '#fff', cursor: 'pointer', color: '#999',
                        transition: 'all 0.15s',
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </button>
                    <button
                      onClick={() => {
                        const url = 'https://labofpdf.com'
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer,width=600,height=500')
                      }}
                      title="Share on Facebook"
                      style={{
                        width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #e3e7e5',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: '#fff', cursor: 'pointer', color: '#999',
                        transition: 'all 0.15s',
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── RIGHT ─── */}
          <div className="panda-progress-card" style={{
            minWidth: 0,
            padding: '20px',
            borderRadius: '22px',
          }}>
            <div className="panda-level-overline">HUA HUA'S GROWTH BOOK</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="panda-level-portrait">
                <img src="/hua-hua-portrait-v1.webp" alt="Hua Hua panda portrait" />
              </div>
              <div className="panda-level-identity">
                <div>HUA HUA</div>
                <span>Growing with the community</span>
              </div>
              <div className="panda-level-seal"><small>LEVEL</small>{info.level}</div>
            </div>

            <div className="panda-level-progress">
              <div className="panda-level-progress-fill" style={{
                height: '100%', width: `${Math.min(Math.max(info.progress * 100, 0), 100)}%`,
                transition: 'width 0.6s ease',
              }} />
            </div>

            <div className="panda-level-needed">
              <span>{info.needed.toLocaleString()}</span> more bamboo to grow
            </div>

            <div className="panda-level-divider"><span /></div>

            <div className="panda-milestone">
              <div className="panda-milestone-bamboo" aria-hidden="true"><i /><i /><i /></div>
              <div>
                <span>NEXT MILESTONE</span>
                <strong>Level {info.level + 1}</strong>
                <small>{info.nextMilestone.toLocaleString()} bamboo collected</small>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
