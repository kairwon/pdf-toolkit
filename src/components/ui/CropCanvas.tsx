import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import { renderPageToCanvas } from '../../lib/pdfLazy'
import { clampNormalizedBox } from '../../lib/visualEdits'

export type CropBox = { x: number; y: number; width: number; height: number }
type Props = { file: File; pageCount: number; pageNumber: number; box: CropBox; disabled?: boolean; onPageChange: (page: number) => void; onChange: (box: CropBox) => void }

export default function CropCanvas({ file, pageCount, pageNumber, box, disabled, onPageChange, onChange }: Props) {
  const [preview, setPreview] = useState('')
  const stageRef = useRef<HTMLDivElement>(null)
  const action = useRef<{ kind: 'move' | 'resize'; pointerId: number; startX: number; startY: number; box: CropBox } | null>(null)
  useEffect(() => { let active = true; void renderPageToCanvas(file, pageNumber, 1.25, 'jpeg', .88).then((value) => { if (active) setPreview(value) }); return () => { active = false } }, [file, pageNumber])
  const begin = (event: ReactPointerEvent<HTMLElement>, kind: 'move' | 'resize') => { if (disabled) return; event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); action.current = { kind, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, box } }
  const move = (event: ReactPointerEvent<HTMLElement>) => {
    const current = action.current
    const bounds = stageRef.current?.getBoundingClientRect()
    if (!current || current.pointerId !== event.pointerId || !bounds) return
    const dx = (event.clientX - current.startX) / bounds.width
    const dy = (event.clientY - current.startY) / bounds.height
    onChange(clampNormalizedBox(current.kind === 'move' ? { ...current.box, x: current.box.x + dx, y: current.box.y + dy } : { ...current.box, width: current.box.width + dx, height: current.box.height + dy }))
  }
  const end = () => { action.current = null }
  return <section className="crop-editor"><header><div><span>VISUAL CROP</span><h2>Drag the crop frame over the area to keep</h2><p>The shaded area is removed. Resize from the lower-right handle.</p></div><div className="watermark-page-switcher"><button aria-label="Previous page" disabled={disabled || pageNumber === 1} onClick={() => onPageChange(pageNumber - 1)}><ChevronLeft /></button><span>Page {pageNumber} of {pageCount}</span><button aria-label="Next page" disabled={disabled || pageNumber === pageCount} onClick={() => onPageChange(pageNumber + 1)}><ChevronRight /></button></div></header><div className="crop-stage" ref={stageRef}>{preview ? <img src={preview} alt={`PDF page ${pageNumber} crop preview`} draggable={false} /> : <div className="watermark-page-loading">Rendering page…</div>}<div className="crop-shade" /><div className="crop-box" style={{ left:`${box.x * 100}%`, top:`${box.y * 100}%`, width:`${box.width * 100}%`, height:`${box.height * 100}%` }} role="group" tabIndex={0} aria-label="Crop area" onPointerDown={(event) => begin(event,'move')} onPointerMove={move} onPointerUp={end} onPointerCancel={end}><span>KEEP</span><button aria-label="Resize crop area" onPointerDown={(event) => begin(event,'resize')}><Maximize2 /></button></div></div></section>
}
