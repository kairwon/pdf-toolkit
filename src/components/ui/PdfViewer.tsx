import { useState, useCallback, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Check, RotateCw } from 'lucide-react'
import { renderPageToCanvas } from '../../lib/pdf'

export interface PreviewItem {
  id?: string
  index: number
  controlIndex?: number
  file: File
  label?: string
}

function controlIndexFor(page: PreviewItem) {
  return page.controlIndex ?? page.index
}

function renderKeyFor(page: PreviewItem) {
  return page.id ?? `${page.file.name}-${page.file.size}-${page.file.lastModified}-${page.index}`
}

interface PdfViewerProps {
  pages: PreviewItem[]
  selected: Set<number>
  onToggle: (pageIndex: number) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  rotations?: Record<number, number>
  onRotatePage?: (pageIndex: number, direction: 1 | -1) => void
  onReorderPages?: (fromIndex: number, toIndex: number) => void
  headerRight?: React.ReactNode
  initialPage?: number
}

export default function PdfViewer({
  pages,
  selected,
  onToggle,
  onSelectAll,
  onDeselectAll,
  rotations = {},
  onRotatePage = () => {},
  onReorderPages,
  headerRight,
  initialPage = 0,
}: PdfViewerProps) {
  const [current, setCurrent] = useState(initialPage)
  const [rendered, setRendered] = useState<Record<string, string>>({})
  const stripRef = useRef<HTMLDivElement>(null)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const goTo = useCallback((i: number) => {
    if (i < 0 || i >= pages.length) return
    setCurrent(i)
  }, [pages.length])

  const allSelected = pages.length > 0 && selected.size === pages.length

  useEffect(() => {
    const load = async (idx: number) => {
      const p = pages[idx]
      if (!p) return
      const key = renderKeyFor(p)
      if (rendered[key]) return
      try {
        const dataUrl = await renderPageToCanvas(p.file, p.index + 1, 2)
        setRendered((prev) => ({ ...prev, [key]: dataUrl }))
      } catch { /* ignore */ }
    }
    load(current)
    if (current > 0) load(current - 1)
    if (current < pages.length - 1) load(current + 1)
  }, [current, pages, rendered])

  useEffect(() => {
    if (!stripRef.current) return
    const el = stripRef.current.children[current] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [current])

  useEffect(() => {
    setCurrent((value) => Math.min(value, Math.max(pages.length - 1, 0)))
  }, [pages.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goTo(current - 1)
      if (e.key === 'ArrowRight') goTo(current + 1)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [current, goTo])

  const handleDragStart = useCallback((e: React.DragEvent, i: number) => {
    setDragFrom(i)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(i))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, i: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(i)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, to: number) => {
    e.preventDefault()
    if (dragFrom !== null && dragFrom !== to && onReorderPages) {
      onReorderPages(dragFrom, to)
    }
    setDragFrom(null)
    setDragOver(null)
  }, [dragFrom, onReorderPages])

  const handleDragEnd = useCallback(() => {
    setDragFrom(null)
    setDragOver(null)
  }, [])

  if (pages.length === 0) {
    return (
      <div className="section-card overflow-hidden py-12 flex items-center justify-center text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          Loading pages...
        </div>
      </div>
    )
  }

  const currentKey = renderKeyFor(pages[current])
  const currentSrc = rendered[currentKey]
  const currentControlIndex = controlIndexFor(pages[current])
  const currentRot = rotations[currentControlIndex] || 0

  return (
    <div className="section-card overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700/30">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Page {current + 1} of {pages.length}
          {pages[current].label && (
            <span className="text-gray-300 dark:text-gray-600 ml-2">· {pages[current].label} · source page {pages[current].index + 1}</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{selected.size} / {pages.length} selected</span>
          <button type="button" onClick={allSelected ? onDeselectAll : onSelectAll}
               className="cursor-pointer bg-jade/10 dark:bg-jade-dark/20 text-jade dark:text-jade-light text-xs font-medium px-2.5 py-1 rounded-md border border-[#dde4d8] dark:border-jade-dark/40 hover:bg-jade/20 dark:hover:bg-jade-dark/30 transition-colors">
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          {headerRight}
        </div>
      </div>

      {/* Preview area */}
      <div className="bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-center relative px-4 py-4" style={{ minHeight: 320, maxHeight: '55vh' }}>
        {current > 0 && (
          <button onClick={() => goTo(current - 1)}
            className="absolute left-2 z-10 p-1.5 rounded-full bg-white/70 dark:bg-gray-800/70 text-gray-500 hover:bg-white hover:text-gray-800 shadow-sm transition-all border border-gray-200 dark:border-gray-700"><ChevronLeft size={22} /></button>
        )}
        {current < pages.length - 1 && (
          <button onClick={() => goTo(current + 1)}
            className="absolute right-2 z-10 p-1.5 rounded-full bg-white/70 dark:bg-gray-800/70 text-gray-500 hover:bg-white hover:text-gray-800 shadow-sm transition-all border border-gray-200 dark:border-gray-700"><ChevronRight size={22} /></button>
        )}

        <div className="absolute top-2 left-2 z-10 flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); onRotatePage(currentControlIndex, -1) }}
            title="Rotate counter-clockwise"
            className="p-1.5 rounded-lg bg-white/80 dark:bg-gray-800/80 text-gray-500 hover:text-jade hover:bg-white shadow-sm border border-gray-200 dark:border-gray-700 transition-all">
            <RotateCw size={20} className="scale-x-[-1]" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onRotatePage(currentControlIndex, 1) }}
            title="Rotate clockwise"
            className="p-1.5 rounded-lg bg-white/80 dark:bg-gray-800/80 text-gray-500 hover:text-jade hover:bg-white shadow-sm border border-gray-200 dark:border-gray-700 transition-all">
            <RotateCw size={20} />
          </button>
          {currentRot !== 0 && (
            <span className="text-[10px] bg-jade/80 text-white px-1.5 py-0.5 rounded-md self-center ml-0.5 font-medium">{currentRot}°</span>
          )}
        </div>

        {currentSrc ? (
          <img src={currentSrc} alt={`Page ${pages[current].index + 1}`}
            className="max-w-full max-h-[52vh] object-contain rounded-lg shadow-sm transition-transform duration-200"
            style={{ transform: `rotate(${currentRot}deg)` }} />
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-300 dark:text-gray-600">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            Loading page...
          </div>
        )}
      </div>

      {/* Selectable & draggable filmstrip */}
      <div className="border-t border-gray-100 dark:border-gray-700/30 bg-white/50 dark:bg-black/10">
        <div className="px-4 pt-2.5 pb-1">
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Rearrange pages — drag thumbnails to reorder</p>
        </div>
        <div ref={stripRef} className="flex gap-2 overflow-x-auto px-4 py-2 pb-3 scrollbar-thin" style={{ scrollbarWidth: 'thin' }}>
          {pages.map((p, i) => {
            const key = renderKeyFor(p)
            const controlIndex = controlIndexFor(p)
            const isCurrent = i === current
            const isSelected = selected.has(controlIndex)
            const isDragging = dragFrom === i
            const isOver = dragOver === i

            return (
              <div key={`${key}-${i}`}
                draggable={!!onReorderPages}
                onDragStart={(e) => handleDragStart(e, i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                className={`relative group shrink-0 ${isDragging ? 'opacity-40' : ''} ${isOver && dragFrom !== i ? 'mt-1' : ''}`}
              >
                <div onClick={() => goTo(i)}
                  className={`w-20 h-[88px] rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    isCurrent
                      ? 'border-jade shadow-sm shadow-jade/20 dark:shadow-jade/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                  {/* Drop indicator line at top */}
                  {isOver && dragFrom !== i && onReorderPages && (
                    <div className="absolute -top-1 left-0 right-0 h-0.5 bg-jade rounded-full" />
                  )}
                  <img src={rendered[key] || undefined} alt={`Page ${p.index + 1}`}
                    className={`w-full h-full object-cover transition-opacity ${rendered[key] ? '' : 'opacity-0'}`}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  {!rendered[key] && (
                    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] text-gray-300 dark:text-gray-600">
                      {p.index + 1}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-1 px-0.5">
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{i + 1}</span>
                  <button type="button" aria-label={`${isSelected ? 'Deselect' : 'Select'} page ${i + 1}`} onClick={(e) => { e.stopPropagation(); onToggle(controlIndex) }}
                    className={`w-4 h-4 rounded flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-gradient-to-br from-jade to-jade-light text-white'
                        : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-jade/50'
                    }`}>
                    {isSelected && <Check size={10} strokeWidth={3} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
