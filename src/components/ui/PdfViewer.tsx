import { useState, useCallback, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Check, MoveLeft, MoveRight, RotateCw } from 'lucide-react'
import { renderPageToCanvas } from '../../lib/pdfLazy'

export interface PreviewItem {
  id?: string
  index: number
  controlIndex?: number
  file: File
  label?: string
  blankSize?: { width: number; height: number }
}

function controlIndexFor(page: PreviewItem) {
  return page.controlIndex ?? page.index
}

const fileIdentities = new WeakMap<File, number>()
let nextFileIdentity = 1

function renderKeyFor(page: PreviewItem) {
  if (page.id) return page.id
  let fileIdentity = fileIdentities.get(page.file)
  if (!fileIdentity) {
    fileIdentity = nextFileIdentity++
    fileIdentities.set(page.file, fileIdentity)
  }
  return `${fileIdentity}-${page.index}`
}

interface PdfViewerProps {
  pages: PreviewItem[]
  selected: Set<number>
  onToggle: (pageIndex: number) => void
  onSelectRange?: (pageIndices: number[], selected: boolean) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  rotations?: Record<number, number>
  onRotatePage?: (pageIndex: number, direction: 1 | -1) => void
  onReorderPages?: (fromIndex: number, toIndex: number) => void
  headerRight?: React.ReactNode
  initialPage?: number
  interactionDisabled?: boolean
  goToRequest?: { index: number; token: number } | null
  onCurrentChange?: (pageIndex: number) => void
}

export default function PdfViewer({
  pages,
  selected,
  onToggle,
  onSelectRange,
  onSelectAll,
  onDeselectAll,
  rotations = {},
  onRotatePage = () => {},
  onReorderPages,
  headerRight,
  initialPage = 0,
  interactionDisabled = false,
  goToRequest = null,
  onCurrentChange,
}: PdfViewerProps) {
  const [current, setCurrent] = useState(initialPage)
  const [rendered, setRendered] = useState<Record<string, string>>({})
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  const stripRef = useRef<HTMLDivElement>(null)
  const thumbnailCacheRef = useRef(thumbnails)
  const thumbnailLoads = useRef(new Set<string>())
  const selectionAnchor = useRef<number | null>(null)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const goTo = useCallback((i: number) => {
    if (i < 0 || i >= pages.length) return
    setCurrent(i)
  }, [pages.length])

  const allSelected = pages.length > 0 && selected.size === pages.length

  useEffect(() => {
    thumbnailCacheRef.current = thumbnails
  }, [thumbnails])

  const loadThumbnail = useCallback(async (idx: number) => {
    const page = pages[idx]
    if (!page) return
    if (page.blankSize) return
    const key = renderKeyFor(page)
    if (thumbnailCacheRef.current[key] || thumbnailLoads.current.has(key)) return
    thumbnailLoads.current.add(key)
    try {
      const dataUrl = await renderPageToCanvas(page.file, page.index + 1, 0.35)
      thumbnailCacheRef.current = { ...thumbnailCacheRef.current, [key]: dataUrl }
      setThumbnails((prev) => prev[key] ? prev : { ...prev, [key]: dataUrl })
    } catch { /* keep the numbered placeholder */ }
    finally { thumbnailLoads.current.delete(key) }
  }, [pages])

  useEffect(() => {
    const load = async (idx: number) => {
      const p = pages[idx]
      if (!p) return
      if (p.blankSize) return
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
    const strip = stripRef.current
    if (!strip) return
    const pageElements = Array.from(strip.querySelectorAll<HTMLElement>('[data-preview-index]'))
    if (!('IntersectionObserver' in window)) {
      pageElements.slice(0, 12).forEach((element) => void loadThumbnail(Number(element.dataset.previewIndex)))
      return
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const element = entry.target as HTMLElement
        void loadThumbnail(Number(element.dataset.previewIndex))
        observer.unobserve(element)
      })
    }, { root: strip, rootMargin: '0px 120px' })
    pageElements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [loadThumbnail, pages])

  useEffect(() => {
    setCurrent((value) => Math.min(value, Math.max(pages.length - 1, 0)))
  }, [pages.length])

  useEffect(() => {
    const page = pages[current]
    if (page) onCurrentChange?.(controlIndexFor(page))
  }, [current, onCurrentChange, pages])

  useEffect(() => {
    if (goToRequest) goTo(goToRequest.index)
  }, [goTo, goToRequest])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target
      if (target instanceof HTMLElement && (
        target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName) ||
        target.closest('[role="textbox"]')
      )) return
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1) }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1) }
      if (e.key === 'Home') { e.preventDefault(); goTo(0) }
      if (e.key === 'End') { e.preventDefault(); goTo(pages.length - 1) }
      if (e.key === 'PageUp') { e.preventDefault(); goTo(Math.max(0, current - 10)) }
      if (e.key === 'PageDown') { e.preventDefault(); goTo(Math.min(pages.length - 1, current + 10)) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [current, goTo, pages.length])

  const handleSelection = useCallback((event: React.MouseEvent, position: number, controlIndex: number) => {
    event.stopPropagation()
    if (interactionDisabled) return
    if (event.shiftKey && selectionAnchor.current !== null && onSelectRange) {
      const start = Math.min(selectionAnchor.current, position)
      const end = Math.max(selectionAnchor.current, position)
      const pageIndices = pages.slice(start, end + 1).map(controlIndexFor)
      onSelectRange(pageIndices, !selected.has(controlIndex))
    } else {
      onToggle(controlIndex)
    }
    selectionAnchor.current = position
  }, [interactionDisabled, onSelectRange, onToggle, pages, selected])

  const handleDragStart = useCallback((e: React.DragEvent, i: number) => {
    if (interactionDisabled) return
    setDragFrom(i)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(i))
  }, [interactionDisabled])

  const handleDragOver = useCallback((e: React.DragEvent, i: number) => {
    if (interactionDisabled) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(i)
  }, [interactionDisabled])

  const handleDrop = useCallback((e: React.DragEvent, to: number) => {
    e.preventDefault()
    if (!interactionDisabled && dragFrom !== null && dragFrom !== to && onReorderPages) {
      onReorderPages(dragFrom, to)
    }
    setDragFrom(null)
    setDragOver(null)
  }, [dragFrom, interactionDisabled, onReorderPages])

  const handleDragEnd = useCallback(() => {
    setDragFrom(null)
    setDragOver(null)
  }, [])

  const moveCurrent = useCallback((direction: -1 | 1) => {
    if (!onReorderPages || interactionDisabled) return
    const destination = current + direction
    if (destination < 0 || destination >= pages.length) return
    onReorderPages(current, destination)
    setCurrent(destination)
  }, [current, interactionDisabled, onReorderPages, pages.length])

  if (pages.length === 0) {
    return (
      <div className="section-card overflow-hidden py-12 flex items-center justify-center text-sm text-gray-400">
        <div className="flex items-center justify-end gap-2 flex-wrap">
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
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700/30 flex-wrap">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-0">
          Page {current + 1} of {pages.length}
          {pages[current].label && (
            <span className="text-gray-300 dark:text-gray-600 ml-2">
              · {pages[current].label}{!pages[current].blankSize && ` · source page ${pages[current].index + 1}`}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{selected.size} / {pages.length} selected</span>
          <button type="button" onClick={allSelected ? onDeselectAll : onSelectAll}
               disabled={interactionDisabled}
               className="cursor-pointer bg-jade/10 dark:bg-jade-dark/20 text-jade dark:text-jade-light text-xs font-medium px-2.5 py-1 rounded-md border border-[#dde4d8] dark:border-jade-dark/40 hover:bg-jade/20 dark:hover:bg-jade-dark/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
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
            disabled={interactionDisabled}
            title="Rotate counter-clockwise"
            aria-label={`Rotate page ${current + 1} counter-clockwise`}
            className="p-1.5 rounded-lg bg-white/80 dark:bg-gray-800/80 text-gray-500 hover:text-jade hover:bg-white shadow-sm border border-gray-200 dark:border-gray-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <RotateCw size={20} className="scale-x-[-1]" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onRotatePage(currentControlIndex, 1) }}
            disabled={interactionDisabled}
            title="Rotate clockwise"
            aria-label={`Rotate page ${current + 1} clockwise`}
            className="p-1.5 rounded-lg bg-white/80 dark:bg-gray-800/80 text-gray-500 hover:text-jade hover:bg-white shadow-sm border border-gray-200 dark:border-gray-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <RotateCw size={20} />
          </button>
          {onReorderPages && (
            <>
              <button type="button" onClick={() => moveCurrent(-1)} disabled={interactionDisabled || current === 0}
                title="Move this page left"
                aria-label={`Move page ${current + 1} left`}
                className="p-1.5 rounded-lg bg-white/80 dark:bg-gray-800/80 text-gray-500 hover:text-jade hover:bg-white shadow-sm border border-gray-200 dark:border-gray-700 transition-all disabled:opacity-35 disabled:cursor-not-allowed">
                <MoveLeft size={20} />
              </button>
              <button type="button" onClick={() => moveCurrent(1)} disabled={interactionDisabled || current === pages.length - 1}
                title="Move this page right"
                aria-label={`Move page ${current + 1} right`}
                className="p-1.5 rounded-lg bg-white/80 dark:bg-gray-800/80 text-gray-500 hover:text-jade hover:bg-white shadow-sm border border-gray-200 dark:border-gray-700 transition-all disabled:opacity-35 disabled:cursor-not-allowed">
                <MoveRight size={20} />
              </button>
            </>
          )}
          {currentRot !== 0 && (
            <span className="text-[10px] bg-jade/80 text-white px-1.5 py-0.5 rounded-md self-center ml-0.5 font-medium">{currentRot}°</span>
          )}
        </div>

        {pages[current].blankSize ? (
          <div
            role="img"
            aria-label={`Blank page ${current + 1}`}
            className="bg-white border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm transition-transform duration-200"
            style={{
              aspectRatio: `${pages[current].blankSize.width} / ${pages[current].blankSize.height}`,
              height: 'min(46vh, 420px)',
              transform: `rotate(${currentRot}deg)`,
            }}
          />
        ) : currentSrc ? (
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
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {onReorderPages ? 'Rearrange pages — drag thumbnails or use the move buttons above' : 'Choose the pages to include'}
          </p>
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
                data-preview-index={i}
                draggable={!!onReorderPages && !interactionDisabled}
                onDragStart={(e) => handleDragStart(e, i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                className={`relative group shrink-0 ${isDragging ? 'opacity-40' : ''} ${isOver && dragFrom !== i ? 'mt-1' : ''}`}
              >
                <button type="button" onClick={() => goTo(i)} aria-label={`View page ${i + 1}`}
                  className={`w-20 h-[88px] rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    isCurrent
                      ? 'border-jade shadow-sm shadow-jade/20 dark:shadow-jade/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                  {/* Drop indicator line at top */}
                  {isOver && dragFrom !== i && onReorderPages && (
                    <div className="absolute -top-1 left-0 right-0 h-0.5 bg-jade rounded-full" />
                  )}
                  {!p.blankSize && <img src={rendered[key] || thumbnails[key] || undefined} alt={`Page ${p.index + 1}`}
                    className={`w-full h-full object-cover transition-opacity ${rendered[key] || thumbnails[key] ? '' : 'opacity-0'}`}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />}
                  {!rendered[key] && !thumbnails[key] && (
                    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] text-gray-300 dark:text-gray-600">
                      {p.blankSize ? 'Blank' : p.index + 1}
                    </div>
                  )}
                </button>

                <div className="flex items-center justify-between mt-1 px-0.5">
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{i + 1}</span>
                  <button type="button" disabled={interactionDisabled} aria-label={`${isSelected ? 'Deselect' : 'Select'} page ${i + 1}`} onClick={(event) => handleSelection(event, i, controlIndex)}
                    title="Click to toggle; Shift-click to select a continuous range"
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-gradient-to-br from-jade to-jade-light text-white'
                        : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-jade/50'
                    }`}>
                    {isSelected && <Check size={14} strokeWidth={3} />}
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
