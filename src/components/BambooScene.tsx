import { useRef } from 'react'

const bambooColors = [
  'rgba(129,199,132,0.5)',
  'rgba(102,187,106,0.5)',
  'rgba(76,175,80,0.5)',
]
const bambooLayers = [
  { count: 18, blur: 'blur(1.5px)', duration: [4, 6], width: [1, 3], colors: 0 },
  { count: 12, blur: 'blur(0.5px)', duration: [3, 5], width: [2, 5], colors: 1 },
  { count: 8, blur: 'none', duration: [2.5, 4], width: [4, 9], colors: 2 },
]

interface BambooStalk {
  left: number
  height: number
  width: number
  delay: number
  duration: number
  color: string
  nodes: { top: number }[]
  leaves: { top: number; side: number; size: [number, number]; angle: number }[]
}

function generateBamboo(layerIdx: number): BambooStalk[] {
  const layer = bambooLayers[layerIdx]
  const stalks: BambooStalk[] = []
  const spacing = 100 / (layer.count + 1)
  for (let i = 0; i < layer.count; i++) {
    const left = spacing * (i + 1) + (Math.random() - 0.5) * spacing * 0.6
    const height = 38 + Math.random() * 54
    const width = layer.width[0] + Math.random() * (layer.width[1] - layer.width[0])
    const delay = Math.random() * (layer.count * 0.3)
    const duration = layer.duration[0] + Math.random() * (layer.duration[1] - layer.duration[0])
    const color = bambooColors[layer.colors]
    const nodeCount = 3 + Math.floor(height / 18)
    const nodes = Array.from({ length: nodeCount }, (_, j) => ({
      top: 18 + j * 18,
    }))
    const leafCount = layerIdx === 2 ? 2 : 1
    const leaves = Array.from({ length: leafCount }, (_, j) => {
      const side = j % 2 === 0 ? 1 : -1
      const leafH = 4 + Math.random() * 2
      const leafW = 8 + Math.random() * 9
      return {
        top: 12 + Math.random() * 30,
        side: (layerIdx === 2 ? 8 : 3) * side,
        size: [leafW, leafH] as [number, number],
        angle: side * (18 + Math.random() * 7),
      }
    })
    stalks.push({ left, height, width, delay, duration, color, nodes, leaves })
  }
  return stalks
}

const particles = Array.from({ length: 15 }, (_, i) => ({
  left: i * 7 + Math.random() * 4,
  duration: 15 + Math.random() * 18,
  delay: Math.random() * 35,
  width: 2 + Math.floor(Math.random() * 3),
  opacity: 0.2 + Math.random() * 0.4,
}))

export default function BambooScene() {
  const stalksRef0 = useRef(generateBamboo(0))
  const stalksRef1 = useRef(generateBamboo(1))
  const stalksRef2 = useRef(generateBamboo(2))

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
      {/* Sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#fff8e1] via-[#f1f8e9]/90 via-40% via-[#e8f5e9]/80 via-70% to-[#c8e6c9]/60" />

      {/* Sun glow */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, transparent 30%, rgba(255,248,225,0.4) 50%, transparent 70%), linear-gradient(160deg, transparent 40%, rgba(255,243,224,0.2) 55%, transparent 65%)'
      }} />

      {/* Mist streaks */}
      <div className="absolute left-0 right-0 top-[20%] h-[60px] opacity-20"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', animation: 'mst 20s ease-in-out infinite' }} />
      <div className="absolute left-0 right-0 top-[45%] h-[100px] opacity-15"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', animation: 'mst 20s ease-in-out infinite 7s' }} />
      <div className="absolute left-0 right-0 top-[70%] h-[70px] opacity-25"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', animation: 'mst 20s ease-in-out infinite 14s' }} />

      {/* Bamboo layer 1 (far) */}
      <div style={{ filter: 'blur(1.5px)' }}>
        {stalksRef0.current.map((s, i) => (
          <div key={`b0-${i}`} className="absolute bottom-0" style={{
            left: `${s.left}%`, height: `${s.height}%`, width: `${s.width}px`,
            background: `linear-gradient(to top, ${s.color}, ${s.color.replace('0.5','0.3')})`,
            borderRadius: '2px 2px 0 0', transformOrigin: 'bottom center',
            animation: `sw1 ${s.duration}s ease-in-out infinite ${s.delay}s`,
          }}>
            {s.nodes.map((n, j) => (
              <div key={j} className="absolute left-[-1px] right-[-1px] h-[2px] rounded-[1px]"
                style={{ top: `${n.top}%`, background: s.color.replace('0.5','0.12') }} />
            ))}
            {s.leaves.map((l, j) => (
              <div key={`l${j}`} className="absolute rounded-[0_50%_50%_50%]"
                style={{ top: `${l.top}%`, left: `${l.side}px`, width: `${l.size[0]}px`, height: `${l.size[1]}px`,
                  background: 'rgba(165,214,167,0.25)', transformOrigin: '0 50%',
                  transform: `rotate(${l.angle}deg)` }} />
            ))}
          </div>
        ))}
      </div>

      {/* Bamboo layer 2 (mid) */}
      <div style={{ filter: 'blur(0.5px)' }}>
        {stalksRef1.current.map((s, i) => (
          <div key={`b1-${i}`} className="absolute bottom-0" style={{
            left: `${s.left}%`, height: `${s.height}%`, width: `${s.width}px`,
            background: `linear-gradient(to top, ${s.color}, ${s.color.replace('0.5','0.3')})`,
            borderRadius: '2px 2px 0 0', transformOrigin: 'bottom center',
            animation: `sw2 ${s.duration}s ease-in-out infinite ${s.delay}s`,
          }}>
            {s.nodes.map((n, j) => (
              <div key={j} className="absolute left-[-1px] right-[-1px] h-[2px] rounded-[1px]"
                style={{ top: `${n.top}%`, background: s.color.replace('0.5','0.12') }} />
            ))}
            {s.leaves.map((l, j) => (
              <div key={`l${j}`} className="absolute rounded-[0_50%_50%_50%]"
                style={{ top: `${l.top}%`, left: `${l.side}px`, width: `${l.size[0]}px`, height: `${l.size[1]}px`,
                  background: 'rgba(129,199,132,0.3)', transformOrigin: '0 50%',
                  transform: `rotate(${l.angle}deg)` }} />
            ))}
          </div>
        ))}
      </div>

      {/* Bamboo layer 3 (near) */}
      <div>
        {stalksRef2.current.map((s, i) => (
          <div key={`b2-${i}`} className="absolute bottom-0" style={{
            left: `${s.left}%`, height: `${s.height}%`, width: `${s.width}px`,
            background: `linear-gradient(to top, ${s.color}, ${s.color.replace('0.5','0.3')})`,
            borderRadius: '2px 2px 0 0', transformOrigin: 'bottom center',
            animation: `sw3 ${s.duration}s ease-in-out infinite ${s.delay}s`,
          }}>
            {s.nodes.map((n, j) => (
              <div key={j} className="absolute left-[-1px] right-[-1px] h-[2px] rounded-[1px]"
                style={{ top: `${n.top}%`, background: s.color.replace('0.5','0.18') }} />
            ))}
            {s.leaves.map((l, j) => (
              <div key={`l${j}`} className="absolute rounded-[0_50%_50%_50%]"
                style={{ top: `${l.top}%`, left: `${l.side}px`, width: `${l.size[0]}px`, height: `${l.size[1]}px`,
                  background: 'rgba(102,187,106,0.4)', transformOrigin: '0 50%',
                  transform: `rotate(${l.angle}deg)` }} />
            ))}
          </div>
        ))}
      </div>

      {/* Ground fade */}
      <div className="absolute bottom-0 left-0 right-0 h-[60px] z-[4]"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(76,175,80,0.08) 40%, rgba(76,175,80,0.12))' }} />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <div key={`p${i}`} className="absolute rounded-full"
          style={{
            left: `${p.left}%`, width: `${p.width}px`, height: `${p.width}px`,
            background: 'rgba(255,248,200,0.35)', opacity: p.opacity,
            animation: `pq ${p.duration}s linear infinite ${p.delay}s`,
          }} />
      ))}
    </div>
  )
}
