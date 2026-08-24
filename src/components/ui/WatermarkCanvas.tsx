import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { ChevronLeft, ChevronRight, Grip, Maximize2 } from 'lucide-react'
import { renderPageToCanvas } from '../../lib/pdf'
import { clampWatermarkAnchor, type WatermarkAnchor } from '../../lib/watermarkPlacement'

type Props = {
  file: File
  pageCount: number
  mode: 'text' | 'image'
  text: string
  imagePreview: string | null
  color: string
  opacity: number
  angle: number
  widthRatio: number
  anchor: WatermarkAnchor
  tiled: boolean
  disabled?: boolean
  onAnchorChange: (anchor: WatermarkAnchor) => void
  onWidthChange: (ratio: number) => void
  onTiledChange: (tiled: boolean) => void
}

type PointerAction = {
  kind: 'move' | 'resize'
  pointerId: number
  startX: number
  startY: number
  anchor: WatermarkAnchor
  widthRatio: number
}

const presets = [
  { label: 'Top left', x: 0.14, y: 0.14 }, { label: 'Top center', x: 0.5, y: 0.14 }, { label: 'Top right', x: 0.86, y: 0.14 },
  { label: 'Center left', x: 0.14, y: 0.5 }, { label: 'Center', x: 0.5, y: 0.5 }, { label: 'Center right', x: 0.86, y: 0.5 },
  { label: 'Bottom left', x: 0.14, y: 0.86 }, { label: 'Bottom center', x: 0.5, y: 0.86 }, { label: 'Bottom right', x: 0.86, y: 0.86 },
]

export default function WatermarkCanvas({
  file, pageCount, mode, text, imagePreview, color, opacity, angle, widthRatio, anchor, tiled, disabled,
  onAnchorChange, onWidthChange, onTiledChange,
}: Props) {
  const [pageNumber, setPageNumber] = useState(1)
  const [pagePreview, setPagePreview] = useState('')
  const [loading, setLoading] = useState(true)
  const stageRef = useRef<HTMLDivElement>(null)
  const pointerAction = useRef<PointerAction | null>(null)

  const keepMarkInsidePage = (nextAnchor: WatermarkAnchor, mark?: HTMLElement | null) => {
    const stage = stageRef.current
    const activeMark = mark ?? stage?.querySelector<HTMLElement>('.watermark-direct-mark.is-interactive')
    if (!stage || !activeMark) return clampWatermarkAnchor(nextAnchor)
    const stageBounds = stage.getBoundingClientRect()
    const markBounds = activeMark.getBoundingClientRect()
    const halfWidth = Math.min(0.5, markBounds.width / stageBounds.width / 2)
    const halfHeight = Math.min(0.5, markBounds.height / stageBounds.height / 2)
    return {
      x: Math.min(1 - halfWidth, Math.max(halfWidth, nextAnchor.x)),
      y: Math.min(1 - halfHeight, Math.max(halfHeight, nextAnchor.y)),
    }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    void renderPageToCanvas(file, pageNumber, 1, 'jpeg', 0.8)
      .then((preview) => { if (active) setPagePreview(preview) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [file, pageNumber])

  useEffect(() => setPageNumber((current) => Math.min(current, Math.max(1, pageCount))), [pageCount])

  const beginPointerAction = (event: ReactPointerEvent<HTMLElement>, kind: PointerAction['kind']) => {
    if (disabled || tiled) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerAction.current = { kind, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, anchor, widthRatio }
  }

  const movePointer = (event: ReactPointerEvent<HTMLElement>) => {
    const action = pointerAction.current
    const stage = stageRef.current
    if (!action || action.pointerId !== event.pointerId || !stage) return
    event.preventDefault()
    const bounds = stage.getBoundingClientRect()
    if (action.kind === 'move') {
      onAnchorChange(keepMarkInsidePage({
        x: action.anchor.x + (event.clientX - action.startX) / bounds.width,
        y: action.anchor.y + (event.clientY - action.startY) / bounds.height,
      }, event.currentTarget))
    } else {
      const delta = ((event.clientX - action.startX) / bounds.width + (event.clientY - action.startY) / bounds.height) / 2
      onWidthChange(Math.min(0.9, Math.max(0.08, action.widthRatio + delta)))
    }
  }

  const endPointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (pointerAction.current?.pointerId === event.pointerId) {
      const mark = event.currentTarget.closest<HTMLElement>('.watermark-direct-mark')
      const stage = stageRef.current
      if (mark && stage) {
        const stageBounds = stage.getBoundingClientRect()
        const markBounds = mark.getBoundingClientRect()
        onAnchorChange(keepMarkInsidePage({
          x: (markBounds.left + markBounds.width / 2 - stageBounds.left) / stageBounds.width,
          y: (markBounds.top + markBounds.height / 2 - stageBounds.top) / stageBounds.height,
        }, mark))
      }
      pointerAction.current = null
    }
  }

  const nudge = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.05 : 0.01
    const movement: Record<string, WatermarkAnchor> = {
      ArrowLeft: { x: anchor.x - step, y: anchor.y },
      ArrowRight: { x: anchor.x + step, y: anchor.y },
      ArrowUp: { x: anchor.x, y: anchor.y - step },
      ArrowDown: { x: anchor.x, y: anchor.y + step },
    }
    if (movement[event.key]) {
      event.preventDefault()
      onAnchorChange(keepMarkInsidePage(movement[event.key], event.currentTarget))
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      onWidthChange(Math.min(0.9, widthRatio + step))
    } else if (event.key === '-') {
      event.preventDefault()
      onWidthChange(Math.max(0.08, widthRatio - step))
    }
  }

  const renderMark = (key: string, markAnchor: WatermarkAnchor, interactive = false) => (
    <div
      key={key}
      className={`watermark-direct-mark${interactive ? ' is-interactive' : ''}`}
      style={{
        left: `${markAnchor.x * 100}%`, top: `${markAnchor.y * 100}%`, width: `${widthRatio * 100}%`,
        opacity: opacity / 100, transform: `translate(-50%, -50%) rotate(${angle}deg)`, color,
      }}
      role={interactive ? 'group' : undefined}
      tabIndex={interactive && !disabled ? 0 : undefined}
      aria-label={interactive ? 'Watermark preview. Drag to move; use arrow keys to nudge; plus and minus resize.' : undefined}
      onKeyDown={interactive ? nudge : undefined}
      onPointerDown={interactive ? (event) => beginPointerAction(event, 'move') : undefined}
      onPointerMove={interactive ? movePointer : undefined}
      onPointerUp={interactive ? endPointer : undefined}
      onPointerCancel={interactive ? endPointer : undefined}
    >
      <span className="watermark-direct-grip" aria-hidden="true"><Grip /></span>
      {mode === 'image' && imagePreview
        ? <img src={imagePreview} alt="" draggable={false} />
        : <span className="watermark-direct-text" style={{ fontSize: `${Math.max(9, Math.min(44, widthRatio * 90))}px` }}>{mode === 'image' ? 'Choose an image' : text || 'Watermark text'}</span>}
      {interactive && <button
        type="button"
        className="watermark-resize-handle"
        aria-label="Drag to resize watermark"
        disabled={disabled}
        onPointerDown={(event) => beginPointerAction(event, 'resize')}
      ><Maximize2 /></button>}
    </div>
  )

  const tiledAnchors = [{ x: 0.25, y: 0.28 }, { x: 0.72, y: 0.28 }, { x: 0.25, y: 0.72 }, { x: 0.72, y: 0.72 }]

  return (
    <section className="watermark-direct-editor" aria-labelledby="watermark-preview-heading">
      <div className="watermark-editor-head">
        <div><span>VISUAL PLACEMENT</span><h2 id="watermark-preview-heading">Drag the watermark onto the page</h2><p>Move the frame directly. Drag its corner to resize; arrow keys fine-tune the position.</p></div>
        <div className="watermark-page-switcher" aria-label="Preview page">
          <button type="button" aria-label="Previous preview page" disabled={disabled || pageNumber === 1} onClick={() => setPageNumber((page) => page - 1)}><ChevronLeft /></button>
          <span>Page {pageNumber} of {pageCount}</span>
          <button type="button" aria-label="Next preview page" disabled={disabled || pageNumber === pageCount} onClick={() => setPageNumber((page) => page + 1)}><ChevronRight /></button>
        </div>
      </div>

      <div className="watermark-editor-layout">
        <div className="watermark-stage" ref={stageRef} aria-busy={loading}>
          {pagePreview ? <img className="watermark-page-image" src={pagePreview} alt={`PDF page ${pageNumber} preview`} draggable={false} /> : <div className="watermark-page-loading">Rendering page preview…</div>}
          {tiled ? tiledAnchors.map((item, index) => renderMark(`tile-${index}`, item)) : renderMark('custom', anchor, true)}
        </div>

        <aside className="watermark-position-presets" aria-label="Watermark position shortcuts">
          <strong>Quick positions</strong>
          <div className="watermark-position-grid">
            {presets.map((preset) => <button
              type="button"
              aria-label={preset.label}
              title={preset.label}
              className={!tiled && Math.abs(anchor.x - preset.x) < 0.01 && Math.abs(anchor.y - preset.y) < 0.01 ? 'active' : ''}
              disabled={disabled}
              onClick={() => { onTiledChange(false); onAnchorChange({ x: preset.x, y: preset.y }) }}
              key={preset.label}
            ><span /></button>)}
          </div>
          <button type="button" className={`watermark-tile-button${tiled ? ' active' : ''}`} disabled={disabled} onClick={() => onTiledChange(!tiled)}>Repeat across page</button>
          <small>The relative position is applied consistently to every selected page, even when page sizes differ.</small>
        </aside>
      </div>
    </section>
  )
}
