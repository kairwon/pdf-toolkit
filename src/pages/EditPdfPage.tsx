import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Copy, Download, Eye, EyeOff, Grid3X3, Hash, Highlighter, ImagePlus, Layers3, Loader2, Lock, Pencil, Redo2, RotateCcw, RotateCw, ShieldX, Square, Trash2, Type, Undo2, Unlock } from 'lucide-react'
import { toast } from 'sonner'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import SignaturePad from '../components/ui/SignaturePad'
import ToolHeader from '../components/ui/ToolHeader'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import VisualEditorCanvas from '../components/ui/VisualEditorCanvas'
import usePageTitle from '../hooks/usePageTitle'
import usePendingFiles from '../hooks/usePendingFiles'
import { getPageCount, inspectPdfStructure, type PdfStructureInspection } from '../lib/pdfLazy'
import { alignVisualEdit, applyVisualEdits, clampNormalizedBox, DEFAULT_PAGE_NUMBERS, duplicateVisualEditToPages, moveVisualEditLayer, normalizeVisualRotation, type NormalizedPoint, type PageNumberOptions, type VisualAlignment, type VisualEdit, type VisualLayerMove } from '../lib/visualEdits'
import { downloadBlob, formatFileSize, triggerDownloadOverlay } from '../lib/utils'

type Props = { initialMode?: 'edit' | 'sign' | 'redact' }
type History = { past: VisualEdit[][]; present: VisualEdit[]; future: VisualEdit[][] }

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function EditPdfPage({ initialMode = 'edit' }: Props) {
  const path = initialMode === 'sign' ? '/sign-pdf' : initialMode === 'redact' ? '/redact-pdf' : '/edit'
  usePageTitle(path)
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [history, setHistory] = useState<History>({ past: [], present: [], future: [] })
  const [inkMode, setInkMode] = useState(false)
  const [inkColor, setInkColor] = useState('#176f52')
  const [inkWidth, setInkWidth] = useState(2)
  const [pageNumbers, setPageNumbers] = useState<PageNumberOptions>(DEFAULT_PAGE_NUMBERS)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [structure, setStructure] = useState<PdfStructureInspection | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const editGestureRef = useRef<{ before: VisualEdit[]; changed: boolean } | null>(null)
  const clipboardRef = useRef<VisualEdit | null>(null)

  const edits = history.present
  const selected = useMemo(() => edits.find((edit) => edit.id === selectedId) ?? null, [edits, selectedId])
  const currentPageEdits = useMemo(() => edits.filter((edit) => edit.pageIndex === pageIndex), [edits, pageIndex])
  const activeEditCount = useMemo(() => edits.filter((edit) => !edit.hidden).length, [edits])

  const commit = useCallback((next: VisualEdit[]) => {
    setHistory((current) => ({ past: [...current.past.slice(-29), current.present], present: next, future: [] }))
  }, [])

  const handleFile = useCallback(async (files: File[]) => {
    const next = files[0]
    if (!next) return
    try {
      const [total, detectedStructure] = await Promise.all([getPageCount(next), inspectPdfStructure(next)])
      setFile(next)
      setPageCount(total)
      setPageIndex(0)
      setSelectedId(null)
      setHistory({ past: [], present: [], future: [] })
      setStructure(detectedStructure)
      toast.success(`Opened ${total} pages in the visual editor`)
    } catch {
      toast.error('This PDF could not be opened. Password-protected files must be unlocked first.')
    }
  }, [])
  usePendingFiles(handleFile)

  const addEdit = (edit: VisualEdit) => {
    commit([...edits, edit])
    setSelectedId(edit.id)
    setInkMode(false)
  }

  const addText = (italic = false) => addEdit({ id: newId(), pageIndex, type: 'text', x: 0.22, y: 0.18, width: 0.56, height: 0.09, text: italic ? 'Your signature' : 'Add text', color: '#183f31', fontSize: italic ? 28 : 16, italic })
  const addRectangle = (kind: 'shape' | 'highlight' | 'redact') => addEdit({
    id: newId(), pageIndex, type: 'rectangle', x: 0.25, y: 0.28, width: 0.5, height: kind === 'highlight' ? 0.07 : 0.13,
    color: kind === 'highlight' ? '#ffe66d' : kind === 'redact' ? '#000000' : '#4f9d7a', opacity: kind === 'highlight' ? 0.42 : 1, redaction: kind === 'redact',
  })
  const addImage = async (image: File) => {
    if (!/^image\/(png|jpeg)$/.test(image.type)) { toast.error('Choose a PNG or JPEG image'); return }
    addEdit({ id: newId(), pageIndex, type: 'image', x: 0.3, y: 0.25, width: 0.4, height: 0.2, dataUrl: await readAsDataUrl(image), alt: image.name })
  }
  const addSignature = (dataUrl: string) => addEdit({ id: newId(), pageIndex, type: 'image', x: 0.3, y: 0.66, width: 0.4, height: 0.13, dataUrl, alt: 'Hand-drawn signature' })
  const addInk = (points: NormalizedPoint[]) => addEdit({ id: newId(), pageIndex, type: 'ink', x: 0, y: 0, width: 1, height: 1, points, color: inkColor, strokeWidth: inkWidth })

  const updateEdit = (updated: VisualEdit) => {
    if (editGestureRef.current) editGestureRef.current.changed = true
    setHistory((current) => ({ ...current, present: current.present.map((edit) => edit.id === updated.id ? updated : edit) }))
  }
  const startEditGesture = () => {
    editGestureRef.current = { before: history.present, changed: false }
  }
  const finishEditGesture = () => setHistory((current) => {
    const gesture = editGestureRef.current
    editGestureRef.current = null
    return gesture?.changed
      ? { past: [...current.past.slice(-29), gesture.before], present: current.present, future: [] }
      : current
  })
  const deleteEdit = (id: string) => { commit(edits.filter((edit) => edit.id !== id)); setSelectedId(null) }
  const duplicateSelected = () => {
    if (!selected) return
    addEdit({ ...selected, id: newId(), x: Math.min(0.9, selected.x + 0.03), y: Math.min(0.9, selected.y + 0.03), hidden: false, locked: false })
  }
  const alignSelected = (alignment: VisualAlignment) => {
    if (!selected || selected.type === 'ink') return
    commit(edits.map((edit) => edit.id === selected.id ? alignVisualEdit(edit, alignment) : edit))
  }
  const setSelectedRotation = (rotation: number) => {
    if (!selected || selected.type === 'ink' || selected.locked) return
    updateEdit({ ...selected, rotation: normalizeVisualRotation(rotation) })
  }
  const setSelectedGeometry = (field: 'x' | 'y' | 'width' | 'height', percent: number) => {
    if (!selected || selected.type === 'ink' || selected.locked || !Number.isFinite(percent)) return
    updateEdit(clampNormalizedBox({ ...selected, [field]: percent / 100 }) as VisualEdit)
  }
  const copySelectedToPages = (scope: 'next' | 'all') => {
    if (!selected) return
    const pages = scope === 'next' ? [selected.pageIndex + 1] : Array.from({ length: pageCount }, (_, index) => index)
    const copies = duplicateVisualEditToPages(selected, pages.filter((index) => index < pageCount), newId)
    if (!copies.length) return
    commit([...edits, ...copies])
    toast.success(scope === 'next' ? 'Copied to the next page' : `Copied to ${copies.length} other pages`)
  }
  const toggleSelectedFlag = (id: string, flag: 'hidden' | 'locked') => {
    commit(edits.map((edit) => edit.id === id ? { ...edit, [flag]: !edit[flag] } : edit))
  }
  const moveLayer = (id: string, direction: VisualLayerMove) => {
    const next = moveVisualEditLayer(edits, id, direction)
    if (next !== edits) commit(next)
  }
  const undo = () => setHistory((current) => current.past.length ? { past: current.past.slice(0, -1), present: current.past[current.past.length - 1], future: [current.present, ...current.future] } : current)
  const redo = () => setHistory((current) => current.future.length ? { past: [...current.past, current.present], present: current.future[0], future: current.future.slice(1) } : current)

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c' && selected) {
        event.preventDefault()
        clipboardRef.current = selected
        toast.success('Object copied')
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v' && clipboardRef.current) {
        event.preventDefault()
        const copied = clipboardRef.current
        addEdit({ ...copied, id: newId(), pageIndex, x: Math.min(0.9, copied.x + 0.02), y: Math.min(0.9, copied.y + 0.02), hidden: false, locked: false })
      } else if (selectedId && !selected?.locked && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault()
        deleteEdit(selectedId)
      }
    }
    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  })

  const download = async () => {
    if (!file || (activeEditCount === 0 && !pageNumbers.enabled)) return
    setProcessing(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const bytes = await applyVisualEdits(file, edits, pageNumbers, (current, total, message) => setProgress(`${message} · ${current}/${total}`), controller.signal)
      const blob = new Blob([Uint8Array.from(bytes).buffer], { type: 'application/pdf' })
      triggerDownloadOverlay('Edited PDF ready!', () => downloadBlob(blob, `edited-${file.name}`))
    } catch (error) {
      toast.error(error instanceof DOMException && error.name === 'AbortError' ? 'Editing cancelled' : 'Could not prepare the edited PDF')
    } finally {
      abortRef.current = null
      setProcessing(false)
      setProgress('')
    }
  }

  if (!file) return (
    <ToolPageWrapper>
      <ToolHeader title={initialMode === 'sign' ? 'Fill & Sign PDF' : initialMode === 'redact' ? 'Securely Redact PDF' : 'Visual PDF Editor'} description="Add text, images, drawings, highlights, signatures and secure redactions directly on real PDF pages. Files stay in this browser." />
      <FileUpload onFiles={handleFile} multiple={false} />
    </ToolPageWrapper>
  )

  return (
    <ToolPageWrapper>
      <ToolHeader title={initialMode === 'sign' ? 'Fill & Sign PDF' : initialMode === 'redact' ? 'Securely Redact PDF' : 'Visual PDF Editor'} description="Place and resize objects directly on each page. Secure redaction flattens affected pages so covered content cannot be recovered." />
      <div className="editor-file-bar">
        <div><strong>{file.name}</strong><span>{formatFileSize(file.size)} · {pageCount} pages · {activeEditCount} visible object{activeEditCount === 1 ? '' : 's'}{activeEditCount !== edits.length ? ` · ${edits.length - activeEditCount} hidden` : ''}</span></div>
        <button type="button" className="btn-ghost" onClick={() => setFile(null)}>Change file</button>
      </div>
      {structure && (structure.hasForm || structure.hasDigitalSignature || structure.hasBookmarks || structure.hasAttachments || structure.hasPageLabels) && <div className="editor-structure-warning"><AlertTriangle /><div><strong>Complex document features detected</strong><span>{[structure.hasForm && 'form fields', structure.hasDigitalSignature && 'digital signatures', structure.hasBookmarks && 'bookmarks', structure.hasAttachments && 'attachments', structure.hasPageLabels && 'page labels'].filter(Boolean).join(', ')}. Visual edits create a new PDF copy and may change or invalidate these structures.</span></div></div>}

      <div className="editor-command-bar" aria-label="PDF editing tools">
        <button type="button" onClick={() => addText(false)}><Type />Text</button>
        <button type="button" onClick={() => addRectangle('highlight')}><Highlighter />Highlight</button>
        <button type="button" onClick={() => addRectangle('shape')}><Square />Shape</button>
        <button type="button" className={inkMode ? 'active' : ''} onClick={() => { setInkMode(!inkMode); setSelectedId(null) }}><Pencil />Draw</button>
        <label className="editor-upload-button"><ImagePlus />Image<input type="file" accept="image/png,image/jpeg" onChange={(event) => { const image = event.target.files?.[0]; if (image) void addImage(image); event.target.value = '' }} /></label>
        <button type="button" onClick={() => addText(true)}>Typed signature</button>
        <button type="button" className="danger" onClick={() => addRectangle('redact')}><ShieldX />Redact</button>
        <label className="editor-snap-toggle"><input type="checkbox" checked={snapToGrid} onChange={(event) => setSnapToGrid(event.target.checked)} /><Grid3X3 />Snap</label>
        <span className="editor-command-spacer" />
        <button type="button" disabled={!history.past.length} onClick={undo} aria-label="Undo"><Undo2 /></button>
        <button type="button" disabled={!history.future.length} onClick={redo} aria-label="Redo"><Redo2 /></button>
        <button type="button" disabled={!selected} onClick={duplicateSelected} aria-label="Duplicate selected"><Copy /></button>
      </div>

      <div className="editor-workspace-grid">
        <VisualEditorCanvas file={file} pageCount={pageCount} pageIndex={pageIndex} edits={edits} selectedId={selectedId} disabled={processing} drawInk={inkMode ? { color: inkColor, strokeWidth: inkWidth } : null} snapToGrid={snapToGrid} onPageChange={(value) => { setPageIndex(value); setSelectedId(null) }} onSelect={setSelectedId} onChange={updateEdit} onChangeStart={startEditGesture} onChangeEnd={finishEditGesture} onDelete={deleteEdit} onAddInk={addInk} />
        <aside className="editor-inspector">
          <section className="editor-layers-section"><h3><Layers3 size={15} /> Layers on page {pageIndex + 1}<span>{currentPageEdits.length}</span></h3>
            {currentPageEdits.length === 0 ? <p className="editor-empty-layers">Add text, a shape, image or drawing to start.</p> : <div className="editor-layer-list">{[...currentPageEdits].reverse().map((edit) => {
              const label = edit.type === 'text' ? (edit.text.trim() || 'Text').slice(0, 24) : edit.type === 'rectangle' ? (edit.redaction ? 'Secure redaction' : edit.opacity < 1 ? 'Highlight' : 'Shape') : edit.type === 'image' ? edit.alt : 'Drawing'
              return <div key={edit.id} className={`editor-layer-row${selectedId === edit.id ? ' active' : ''}${edit.hidden ? ' hidden' : ''}`}><button type="button" className="editor-layer-select" onClick={() => { setSelectedId(edit.id); setInkMode(false) }}><span>{label}</span><small>{edit.type}</small></button><div className="editor-layer-actions"><button type="button" title={edit.hidden ? 'Show layer' : 'Hide layer'} aria-label={edit.hidden ? `Show ${label}` : `Hide ${label}`} onClick={() => toggleSelectedFlag(edit.id, 'hidden')}>{edit.hidden ? <EyeOff /> : <Eye />}</button><button type="button" title={edit.locked ? 'Unlock layer' : 'Lock layer'} aria-label={edit.locked ? `Unlock ${label}` : `Lock ${label}`} onClick={() => toggleSelectedFlag(edit.id, 'locked')}>{edit.locked ? <Lock /> : <Unlock />}</button><button type="button" disabled={edit.locked} title="Delete layer" aria-label={`Delete ${label}`} onClick={() => deleteEdit(edit.id)}><Trash2 /></button></div></div>
            })}</div>}
            {selected && selected.pageIndex === pageIndex && <div className="editor-layer-order"><button type="button" onClick={() => moveLayer(selected.id, 'back')}>To back</button><button type="button" onClick={() => moveLayer(selected.id, 'backward')}>Lower</button><button type="button" onClick={() => moveLayer(selected.id, 'forward')}>Raise</button><button type="button" onClick={() => moveLayer(selected.id, 'front')}>To front</button></div>}
          </section>
          {inkMode && <section><h3>Drawing</h3><label>Ink color<input type="color" value={inkColor} onChange={(event) => setInkColor(event.target.value)} /></label><label>Stroke width<input type="range" min={1} max={12} value={inkWidth} onChange={(event) => setInkWidth(Number(event.target.value))} /></label><button type="button" className="btn-ghost" onClick={() => setInkMode(false)}>Finish drawing</button></section>}
          {selected && selected.type !== 'ink' && <section><h3>Selected {selected.type}</h3>
            {selected.type === 'text' && <><label>Text<textarea value={selected.text} onFocus={startEditGesture} onBlur={finishEditGesture} onChange={(event) => updateEdit({ ...selected, text: event.target.value })} /></label><small className="editor-text-note">Chinese, Arabic, emoji and other non-Latin text is embedded locally as a visual layer for reliable display.</small><label>Text color<input type="color" value={selected.color} onFocus={startEditGesture} onBlur={finishEditGesture} onChange={(event) => updateEdit({ ...selected, color: event.target.value })} /></label><label>Font size<input type="range" min={7} max={60} value={selected.fontSize} onFocus={startEditGesture} onBlur={finishEditGesture} onChange={(event) => updateEdit({ ...selected, fontSize: Number(event.target.value) })} /><span>{selected.fontSize} pt</span></label></>}
            {selected.type === 'rectangle' && !selected.redaction && <><label>Fill color<input type="color" value={selected.color} onFocus={startEditGesture} onBlur={finishEditGesture} onChange={(event) => updateEdit({ ...selected, color: event.target.value })} /></label><label>Opacity<input type="range" min={10} max={100} value={Math.round(selected.opacity * 100)} onFocus={startEditGesture} onBlur={finishEditGesture} onChange={(event) => updateEdit({ ...selected, opacity: Number(event.target.value) / 100 })} /><span>{Math.round(selected.opacity * 100)}%</span></label></>}
            {selected.type === 'rectangle' && selected.redaction && <p className="editor-danger-note">This area will be permanently burned into a flattened page. Searchable text and interactive content on that page will be removed.</p>}
            <div className="editor-geometry-grid" aria-label="Selected object geometry">
              {(['x', 'y', 'width', 'height'] as const).map((field) => <label key={field}>{field === 'x' ? 'Left' : field === 'y' ? 'Top' : field[0].toUpperCase() + field.slice(1)} %<input type="number" min={0} max={100} step={0.5} disabled={selected.locked} value={Number((selected[field] * 100).toFixed(1))} onFocus={startEditGesture} onBlur={finishEditGesture} onChange={(event) => setSelectedGeometry(field, Number(event.target.value))} /></label>)}
            </div>
            <label>Rotation<input type="range" min={-180} max={180} step={1} disabled={selected.locked} value={selected.rotation ?? 0} onFocus={startEditGesture} onBlur={finishEditGesture} onChange={(event) => setSelectedRotation(Number(event.target.value))} /><span>{selected.rotation ?? 0}°</span></label>
            <div className="editor-rotation-row"><button type="button" disabled={selected.locked} aria-label="Rotate 90 degrees counter-clockwise" onClick={() => { startEditGesture(); setSelectedRotation((selected.rotation ?? 0) - 90); finishEditGesture() }}><RotateCcw />−90°</button><button type="button" disabled={selected.locked || !(selected.rotation ?? 0)} onClick={() => { startEditGesture(); setSelectedRotation(0); finishEditGesture() }}>Reset</button><button type="button" disabled={selected.locked} aria-label="Rotate 90 degrees clockwise" onClick={() => { startEditGesture(); setSelectedRotation((selected.rotation ?? 0) + 90); finishEditGesture() }}><RotateCw />+90°</button></div>
            <div className="editor-align-grid" aria-label="Align selected object"><button type="button" onClick={() => alignSelected('left')}>Left</button><button type="button" onClick={() => alignSelected('center')}>Center</button><button type="button" onClick={() => alignSelected('right')}>Right</button><button type="button" onClick={() => alignSelected('top')}>Top</button><button type="button" onClick={() => alignSelected('middle')}>Middle</button><button type="button" onClick={() => alignSelected('bottom')}>Bottom</button></div><div className="editor-copy-row"><button type="button" className="btn-ghost" disabled={selected.pageIndex + 1 >= pageCount} onClick={() => copySelectedToPages('next')}>Copy to next page</button><button type="button" className="btn-ghost" disabled={pageCount < 2} onClick={() => copySelectedToPages('all')}>Copy to all pages</button></div>
          </section>}
          <section><h3>Draw signature</h3><SignaturePad disabled={processing} onUse={addSignature} /></section>
          <section><h3><Hash size={15} /> Page numbers</h3><label className="editor-check"><input type="checkbox" checked={pageNumbers.enabled} onChange={(event) => setPageNumbers({ ...pageNumbers, enabled: event.target.checked })} />Add page numbers</label>
            {pageNumbers.enabled && <><label>Position<select value={pageNumbers.position} onChange={(event) => setPageNumbers({ ...pageNumbers, position: event.target.value as PageNumberOptions['position'] })}><option value="bottom-left">Bottom left</option><option value="bottom-center">Bottom center</option><option value="bottom-right">Bottom right</option><option value="top-left">Top left</option><option value="top-center">Top center</option><option value="top-right">Top right</option></select></label><div className="editor-two-fields"><label>Start page<input type="number" min={1} max={pageCount} value={pageNumbers.startPage} onChange={(event) => setPageNumbers({ ...pageNumbers, startPage: Number(event.target.value) })} /></label><label>Start number<input type="number" value={pageNumbers.startNumber} onChange={(event) => setPageNumbers({ ...pageNumbers, startNumber: Number(event.target.value) })} /></label></div></>}
          </section>
        </aside>
      </div>

      <div className="sticky bottom-4 sticky-bar p-4 flex items-center justify-between gap-3"><span className="text-sm text-gray-400">{activeEditCount} visible edit{activeEditCount === 1 ? '' : 's'} · files never leave this device</span><button type="button" className="btn-primary flex items-center gap-2" disabled={processing || (activeEditCount === 0 && !pageNumbers.enabled)} onClick={download}>{processing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}{processing ? 'Preparing…' : 'Apply edits & download'}</button></div>
      {processing && <ProcessingOverlay message={progress || 'Preparing your edited PDF…'} onCancel={() => abortRef.current?.abort()} />}
    </ToolPageWrapper>
  )
}
