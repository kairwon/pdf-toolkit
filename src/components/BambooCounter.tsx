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
  // Dispatch event so all components update
  window.dispatchEvent(new CustomEvent('bamboo-update', { detail: next }))
}

export default function BambooCounter() {
  const [count, setCount] = useState(getCount)
  const [pop, setPop] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setCount(detail)
      setPop(true)
      setTimeout(() => setPop(false), 500)
    }
    window.addEventListener('bamboo-update', handler)
    return () => window.removeEventListener('bamboo-update', handler)
  }, [])

  return (
    <div className="flex items-center gap-1.5 ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-gray-200 dark:border-gray-700/50">
      <span className="text-xs">🎋</span>
      <span
        className="text-xs font-semibold tabular-nums transition-all duration-200"
        style={{
          color: '#2e7d32',
          transform: pop ? 'scale(1.25)' : 'scale(1)',
        }}
      >
        {count.toLocaleString()}
      </span>
      <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:inline whitespace-nowrap">
        bamboos
      </span>
      <span className="text-[10px] text-gray-400 dark:text-gray-500 sm:hidden">
        🎍
      </span>
    </div>
  )
}
