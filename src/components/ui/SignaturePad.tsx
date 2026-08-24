import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Eraser, PenLine } from 'lucide-react'

type Props = { onUse: (dataUrl: string) => void; disabled?: boolean }

export default function SignaturePad({ onUse, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = 4
    context.strokeStyle = '#183f31'
  }, [])

  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const bounds = canvas.getBoundingClientRect()
    return { x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height }
  }

  const start = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const context = event.currentTarget.getContext('2d')!
    const next = point(event)
    context.beginPath()
    context.moveTo(next.x, next.y)
    drawing.current = true
  }

  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    event.preventDefault()
    const context = event.currentTarget.getContext('2d')!
    const next = point(event)
    context.lineTo(next.x, next.y)
    context.stroke()
    setHasInk(true)
  }

  const end = () => { drawing.current = false }
  const clear = () => {
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
  }

  return (
    <div className="signature-pad">
      <canvas ref={canvasRef} width={720} height={220} aria-label="Draw your signature" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
      <div>
        <button type="button" className="btn-ghost" disabled={!hasInk || disabled} onClick={clear}><Eraser size={14} /> Clear</button>
        <button type="button" className="btn-primary" disabled={!hasInk || disabled} onClick={() => onUse(canvasRef.current!.toDataURL('image/png'))}><PenLine size={14} /> Place signature</button>
      </div>
      <small>Your signature stays in this browser session and is never uploaded.</small>
    </div>
  )
}
