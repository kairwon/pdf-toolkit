import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { ChevronLeft, ChevronRight, Grip, Maximize2, Minus, Plus, Trash2 } from 'lucide-react'
import { renderPageToCanvas } from '../../lib/pdf'
import { clampNormalizedBox, snapVisualEdit, type NormalizedPoint, type VisualEdit } from '../../lib/visualEdits'

type Props = {
  file: File
  pageCount: number
  pageIndex: number
  edits: VisualEdit[]
  selectedId: string | null
  disabled?: boolean
  drawInk?: { color: string; strokeWidth: number } | null
  snapToGrid?: boolean
  onPageChange: (pageIndex: number) => void
  onSelect: (id: string | null) => void
  onChange: (edit: VisualEdit) => void
  onChangeStart?: () => void
  onChangeEnd?: () => void
  onDelete: (id: string) => void
  onAddInk: (points: NormalizedPoint[]) => void
}

type PointerAction = {
  kind: 'move' | 'resize'
  pointerId: number
  startX: number
  startY: number
  edit: VisualEdit
}

export default function VisualEditorCanvas({
  file, pageCount, pageIndex, edits, selectedId, disabled, drawInk, snapToGrid,
  onPageChange, onSelect, onChange, onChangeStart, onChangeEnd, onDelete, onAddInk,
}: Props) {
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(true)
  const stageRef = useRef<HTMLDivElement>(null)
  const pointerAction = useRef<PointerAction | null>(null)
  const inkPoints = useRef<NormalizedPoint[] | null>(null)
  const [activeInk, setActiveInk] = useState<NormalizedPoint[]>([])
  const [zoom, setZoom] = useState(100)

  useEffect(() => {
    let active = true
    setLoading(true)
    void renderPageToCanvas(file, pageIndex + 1, 1.35, 'jpeg', 0.88)
      .then((value) => { if (active) setPreview(value) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [file, pageIndex])

  const relativePoint = (clientX: number, clientY: number) => {
    const bounds = stageRef.current?.getBoundingClientRect()
    if (!bounds) return { x: 0, y: 0 }
    return {
      x: Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, (clientY - bounds.top) / bounds.height)),
    }
  }

  const beginObjectAction = (event: ReactPointerEvent<HTMLElement>, edit: VisualEdit, kind: PointerAction['kind']) => {
    if (disabled || drawInk) return
    event.preventDefault()
    event.stopPropagation()
    onSelect(edit.id)
    if (edit.locked) return
    event.currentTarget.setPointerCapture(event.pointerId)
    onChangeStart?.()
    pointerAction.current = { kind, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, edit }
  }

  const moveObject = (event: ReactPointerEvent<HTMLElement>) => {
    const action = pointerAction.current
    const bounds = stageRef.current?.getBoundingClientRect()
    if (!action || action.pointerId !== event.pointerId || !bounds) return
    event.preventDefault()
    const dx = (event.clientX - action.startX) / bounds.width
    const dy = (event.clientY - action.startY) / bounds.height
    const changed = clampNormalizedBox(action.kind === 'move'
      ? { ...action.edit, x: action.edit.x + dx, y: action.edit.y + dy }
      : { ...action.edit, width: action.edit.width + dx, height: action.edit.height + dy }) as VisualEdit
    onChange(snapToGrid ? snapVisualEdit(changed) : changed)
  }

  const endObject = (event: ReactPointerEvent<HTMLElement>) => {
    if (pointerAction.current?.pointerId === event.pointerId) {
      pointerAction.current = null
      onChangeEnd?.()
    }
  }

  const nudge = (event: ReactKeyboardEvent<HTMLElement>, edit: VisualEdit) => {
    if (edit.locked) return
    const step = event.shiftKey ? 0.025 : 0.005
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onDelete(edit.id)
      return
    }
    const movement: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: edit.x - step, y: edit.y }, ArrowRight: { x: edit.x + step, y: edit.y },
      ArrowUp: { x: edit.x, y: edit.y - step }, ArrowDown: { x: edit.x, y: edit.y + step },
    }
    if (movement[event.key]) {
      event.preventDefault()
      onChangeStart?.()
      const changed = clampNormalizedBox({ ...edit, ...movement[event.key] }) as VisualEdit
      onChange(snapToGrid ? snapVisualEdit(changed) : changed)
      onChangeEnd?.()
    }
  }

  const startInk = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drawInk || disabled) { if (event.target === event.currentTarget) onSelect(null); return }
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = relativePoint(event.clientX, event.clientY)
    inkPoints.current = [point]
    setActiveInk([point])
  }

  const moveInk = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!inkPoints.current) return
    const point = relativePoint(event.clientX, event.clientY)
    const previous = inkPoints.current[inkPoints.current.length - 1]
    if (Math.hypot(point.x - previous.x, point.y - previous.y) < 0.002) return
    inkPoints.current = [...inkPoints.current, point]
    setActiveInk(inkPoints.current)
  }

  const finishInk = () => {
    if (inkPoints.current && inkPoints.current.length > 1) onAddInk(inkPoints.current)
    inkPoints.current = null
    setActiveInk([])
  }

  const pathFor = (points: NormalizedPoint[]) => points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x * 100} ${point.y * 100}`).join(' ')
  const pageEdits = edits.filter((edit) => edit.pageIndex === pageIndex && !edit.hidden)

  return (
    <section className="visual-editor" aria-labelledby="visual-editor-heading">
      <header className="visual-editor-head">
        <div><span>LIVE PAGE CANVAS</span><h2 id="visual-editor-heading">Place objects directly on the PDF</h2><p>Drag objects, resize from the corner, or use arrow keys for precise positioning.</p></div>
        <div className="visual-editor-navigation">
          <div className="visual-zoom-controls" aria-label="Canvas zoom">
            <button type="button" aria-label="Zoom out" disabled={zoom <= 70} onClick={() => setZoom((value) => Math.max(70, value - 10))}><Minus /></button>
            <span>{zoom}%</span>
            <button type="button" aria-label="Zoom in" disabled={zoom >= 160} onClick={() => setZoom((value) => Math.min(160, value + 10))}><Plus /></button>
          </div>
          <div className="watermark-page-switcher" aria-label="Editor page">
          <button type="button" aria-label="Previous page" disabled={disabled || pageIndex === 0} onClick={() => onPageChange(pageIndex - 1)}><ChevronLeft /></button>
          <span>Page {pageIndex + 1} of {pageCount}</span>
          <button type="button" aria-label="Next page" disabled={disabled || pageIndex + 1 === pageCount} onClick={() => onPageChange(pageIndex + 1)}><ChevronRight /></button>
          </div>
        </div>
      </header>
      <div className="visual-editor-stage-scroll"><div
        className={`visual-editor-stage${drawInk ? ' is-drawing' : ''}`}
        ref={stageRef}
        style={{ width: `${zoom}%`, maxWidth: `${7.6 * zoom}px` }}
        aria-busy={loading}
        onPointerDown={startInk}
        onPointerMove={moveInk}
        onPointerUp={finishInk}
        onPointerCancel={finishInk}
      >
        {preview ? <img src={preview} alt={`PDF page ${pageIndex + 1}`} draggable={false} /> : <div className="watermark-page-loading">Rendering page…</div>}
        <svg className="visual-ink-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {pageEdits.filter((edit): edit is Extract<VisualEdit, { type: 'ink' }> => edit.type === 'ink').map((edit) => <path key={edit.id} d={pathFor(edit.points)} stroke={edit.color} strokeWidth={edit.strokeWidth / 6} fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}
          {activeInk.length > 1 && <path d={pathFor(activeInk)} stroke={drawInk?.color} strokeWidth={(drawInk?.strokeWidth ?? 2) / 6} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        </svg>
        {pageEdits.filter((edit) => edit.type !== 'ink').map((edit) => {
          const selected = selectedId === edit.id
          const style = { left: `${edit.x * 100}%`, top: `${edit.y * 100}%`, width: `${edit.width * 100}%`, height: `${edit.height * 100}%`, transform: `rotate(${edit.rotation ?? 0}deg)` }
          return (
            <div
              key={edit.id}
              className={`visual-edit-object is-${edit.type}${selected ? ' is-selected' : ''}${edit.locked ? ' is-locked' : ''}${edit.type === 'rectangle' && edit.redaction ? ' is-redaction' : ''}`}
              style={{
                ...style,
                ...(edit.type === 'rectangle' ? { background: edit.redaction ? '#000' : edit.color, opacity: edit.redaction ? 1 : edit.opacity } : {}),
                ...(edit.type === 'text' ? { color: edit.color, fontSize: `${Math.max(11, Math.min(34, edit.fontSize * 1.25))}px`, fontStyle: edit.italic ? 'italic' : 'normal' } : {}),
              }}
              role="group"
              tabIndex={disabled ? undefined : 0}
              aria-label={`${edit.type} object${edit.locked ? ', locked' : ''}. ${edit.locked ? 'Select it in Layers to unlock.' : 'Drag to move; arrow keys nudge; Delete removes.'}`}
              onKeyDown={(event) => nudge(event, edit)}
              onPointerDown={(event) => beginObjectAction(event, edit, 'move')}
              onPointerMove={moveObject}
              onPointerUp={endObject}
              onPointerCancel={endObject}
            >
              {edit.type === 'text' && <span>{edit.text || 'Text'}</span>}
              {edit.type === 'image' && <img src={edit.dataUrl} alt={edit.alt} draggable={false} />}
              {selected && <>
                <span className="visual-object-grip" aria-hidden="true"><Grip /></span>
                {!edit.locked && <><button type="button" className="visual-object-delete" aria-label="Delete selected object" onClick={(event) => { event.stopPropagation(); onDelete(edit.id) }}><Trash2 /></button>
                <button type="button" className="visual-object-resize" aria-label="Resize selected object" onPointerDown={(event) => beginObjectAction(event, edit, 'resize')}><Maximize2 /></button></>}
              </>}
            </div>
          )
        })}
      </div></div>
    </section>
  )
}
