import { useState } from 'react'

interface PandaPanelProps {
  name: string
  subtitle: string
  levels: number
  totalLevels: number
  flipped?: boolean
  color?: 'green' | 'purple'
}

const moodEmojis: Record<string, string> = {
  idle: '🌸',
  feed: '🎋',
  pet: '🖐️',
}

export default function PandaPanel({ name, subtitle, levels, totalLevels, flipped, color = 'green' }: PandaPanelProps) {
  const [mood, setMood] = useState<'idle' | 'feed' | 'pet'>('idle')
  const [animating, setAnimating] = useState(false)

  const isPurple = color === 'purple'
  const accent = isPurple ? '#a855f7' : '#43a047'
  const accentLight = isPurple ? '#e9d5ff' : '#c8e6c9'
  const accentBg = isPurple ? 'rgba(168,85,247,0.06)' : 'rgba(76,175,80,0.06)'
  const accentBorder = isPurple ? 'rgba(168,85,247,0.1)' : 'rgba(76,175,80,0.1)'

  const feed = () => {
    if (animating) return
    setAnimating(true)
    setMood('feed')
    setTimeout(() => { setMood('idle'); setAnimating(false) }, 600)
  }

  const pet = () => {
    if (animating) return
    setAnimating(true)
    setMood('pet')
    setTimeout(() => { setMood('idle'); setAnimating(false) }, 500)
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 select-none">
      {/* Action buttons */}
      <div className="flex gap-1.5">
        <button
          onClick={feed}
          className="px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide border transition-all duration-200 hover:-translate-y-0.5"
          style={{
            borderColor: accentBorder,
            background: accentBg,
            color: isPurple ? '#9333ea' : 'rgba(58,90,64,0.45)',
          }}
        >
          {moodEmojis.feed} Feed bamboo
        </button>
        <button
          onClick={pet}
          className="px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide border transition-all duration-200 hover:-translate-y-0.5"
          style={{
            borderColor: accentBorder,
            background: accentBg,
            color: isPurple ? '#9333ea' : 'rgba(58,90,64,0.45)',
          }}
        >
          {moodEmojis.pet} {isPurple ? 'Tickle' : 'Pet panda'}
        </button>
      </div>

      {/* Panda image */}
      <div className="relative flex items-center justify-center w-full flex-1">
        <img
          src={`/panda.svg`}
          alt={name}
          className="max-w-[70%] max-h-[65%] object-contain transition-transform duration-300"
          style={{
            filter: 'drop-shadow(0 4px 12px rgba(100,130,100,0.15))',
            transform: flipped ? 'scaleX(-1)' : undefined,
            animation: mood === 'feed' ? 'bnce 0.5s ease' : mood === 'pet' ? 'shke 0.4s ease' : undefined,
          }}
        />
      </div>

      {/* Info */}
      <div className="text-center">
        <div className="text-xs font-semibold tracking-widest" style={{ color: 'rgba(58,90,64,0.5)' }}>
          {mood === 'feed' ? '🎋 Delicious!' : mood === 'pet' ? '😊 Happy panda!' : `🌸 ${name}`}
        </div>
        <div className="text-[10px] tracking-widest" style={{ color: 'rgba(76,175,80,0.3)' }}>
          {subtitle}
        </div>
        <div className="flex gap-1 justify-center mt-1.5">
          {Array.from({ length: totalLevels }, (_, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-colors duration-300"
              style={{ background: i < levels ? accent : accentLight }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
