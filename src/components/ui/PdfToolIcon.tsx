import type { LucideIcon } from 'lucide-react'

export type PdfIconKind =
  | 'standard'
  | 'thesis'
  | 'visa'
  | 'portal'
  | 'compress'
  | 'exact'
  | 'image'
  | 'word'
  | 'split'
  | 'merge'
  | 'manage'
  | 'watermark'
  | 'unwatermark'

type PdfToolIconProps = {
  icon: LucideIcon
  label: string
  size?: 'compact' | 'regular'
  tone?: 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'rose'
  kind?: PdfIconKind
}

export function pdfIconKindForPath(path: string): PdfIconKind {
  if (path === '/thesis-pdf-check') return 'thesis'
  if (path === '/visa-prep') return 'visa'
  if (path === '/portal-ready-pdf') return 'portal'
  if (path === '/compress') return 'compress'
  if (path === '/compress/exact') return 'exact'
  if (path === '/to-image') return 'image'
  if (path === '/to-word') return 'word'
  if (path === '/split') return 'split'
  if (path === '/merge') return 'merge'
  if (path === '/manage' || path === '/edit-pdf') return 'manage'
  if (path === '/watermark') return 'watermark'
  if (path === '/unwatermark') return 'unwatermark'
  return 'standard'
}

function MiniPdf({ className = '', text = 'PDF' }: { className?: string; text?: string }) {
  return <span className={`pdf-scene-page ${className}`}><b>{text}</b><i /><i /></span>
}

function VisualScene({ kind }: { kind: PdfIconKind }) {
  if (kind === 'thesis') {
    return (
      <span className="pdf-visual-scene">
        <MiniPdf className="is-thesis" />
        <span className="pdf-scene-thesis">
          <i className="pdf-scene-cap" />
          <b>✓</b>
        </span>
      </span>
    )
  }
  if (kind === 'visa') {
    return (
      <span className="pdf-visual-scene">
        <MiniPdf />
        <span className="pdf-scene-passport">
          <i />
          <b>VISA</b>
        </span>
      </span>
    )
  }
  if (kind === 'portal') {
    return (
      <span className="pdf-visual-scene">
        <MiniPdf />
        <span className="pdf-scene-arrow">›</span>
        <span className="pdf-scene-portal">
          <i className="pdf-scene-portal-bar" />
          <i className="pdf-scene-portal-slot">↑</i>
          <b>✓</b>
        </span>
      </span>
    )
  }
  if (kind === 'compress') {
    return <span className="pdf-visual-scene"><MiniPdf className="is-large" /><span className="pdf-scene-arrow">›</span><MiniPdf className="is-small" /></span>
  }
  if (kind === 'exact') {
    return <span className="pdf-visual-scene"><MiniPdf /><span className="pdf-scene-arrow">›</span><span className="pdf-scene-target"><b>5</b><small>MB</small></span></span>
  }
  if (kind === 'image') {
    return <span className="pdf-visual-scene"><MiniPdf /><span className="pdf-scene-arrow">›</span><span className="pdf-scene-image"><i /><b>PNG</b></span></span>
  }
  if (kind === 'word') {
    return <span className="pdf-visual-scene"><MiniPdf /><span className="pdf-scene-arrow">›</span><MiniPdf className="is-doc" text="DOC" /></span>
  }
  if (kind === 'split') {
    return <span className="pdf-visual-scene"><MiniPdf /><span className="pdf-scene-arrow">›</span><span className="pdf-scene-double"><MiniPdf /><MiniPdf /></span></span>
  }
  if (kind === 'merge') {
    return <span className="pdf-visual-scene"><span className="pdf-scene-double is-input"><MiniPdf /><MiniPdf /></span><span className="pdf-scene-arrow">›</span><MiniPdf /></span>
  }
  if (kind === 'manage') {
    return <span className="pdf-visual-scene"><span className="pdf-scene-stack"><MiniPdf /><MiniPdf /><MiniPdf /></span><span className="pdf-scene-reorder">↕</span></span>
  }
  if (kind === 'watermark' || kind === 'unwatermark') {
    return <span className="pdf-visual-scene"><MiniPdf className={kind === 'unwatermark' ? 'has-removed-mark' : 'has-mark'} /><span className="pdf-scene-mark">{kind === 'unwatermark' ? '×' : 'A'}</span></span>
  }
  return null
}

export default function PdfToolIcon({
  icon: Icon,
  label,
  size = 'regular',
  tone = 'green',
  kind = 'standard',
}: PdfToolIconProps) {
  const visual = kind !== 'standard'

  return (
    <span
      className={`pdf-tool-icon pdf-tool-icon-${size} tone-${tone} ${visual ? 'is-visual' : ''}`}
      data-kind={kind}
      aria-label={`${label} PDF tool`}
      role="img"
    >
      {visual ? (
        <VisualScene kind={kind} />
      ) : (
        <>
          <span className="pdf-tool-paper">
            <span className="pdf-tool-fold" />
            <span className="pdf-tool-wordmark">PDF</span>
            <span className="pdf-tool-lines"><i /><i /></span>
          </span>
          <span className="pdf-tool-operation"><Icon /></span>
        </>
      )}
    </span>
  )
}
