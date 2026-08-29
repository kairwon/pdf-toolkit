import { useState, useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { Loader2, Download, Redo2, RotateCcw, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import ToolHeader from '../components/ui/ToolHeader'
import FileUpload from '../components/ui/FileUpload'
import PdfViewer from '../components/ui/PdfViewer'
import type { PreviewItem } from '../components/ui/PdfViewer'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import { arrangePdfPages, getPageCount, inspectPdfStructure, renderPageToCanvas } from '../lib/pdfLazy'
import type { ArrangePdfPage, PdfStructureInspection } from '../lib/pdfLazy'
import { describePdfError } from '../lib/pdfErrors'
import { moveSelectedItems } from '../lib/pageLayout'
import { emptyPageLayoutState, pageLayoutReducer } from '../lib/pageLayoutState'
import { parsePageRange } from '../lib/pageRanges'
import { formatFileSize, downloadBlob, triggerDownloadOverlay } from '../lib/utils'
import usePageTitle from '../hooks/usePageTitle'
import usePendingFiles from '../hooks/usePendingFiles'

export default function ManagePage() {
  usePageTitle('/manage')
  const [file, setFile] = useState<File | null>(null)
  const [layout, dispatchLayout] = useReducer(pageLayoutReducer, emptyPageLayoutState)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [pageRange, setPageRange] = useState('')
  const [rangeMode, setRangeMode] = useState<'replace' | 'add' | 'remove'>('replace')
  const [jumpPage, setJumpPage] = useState('')
  const [goToRequest, setGoToRequest] = useState<{ index: number; token: number } | null>(null)
  const [structureInspection, setStructureInspection] = useState<PdfStructureInspection | null>(null)
  const [removedThumbnails, setRemovedThumbnails] = useState<Record<number, string>>({})
  const removedThumbnailsRef = useRef<Record<number, string>>({})
  const [movePosition, setMovePosition] = useState('')
  const [blankPosition, setBlankPosition] = useState('')
  const [blankFormat, setBlankFormat] = useState<'a4' | 'letter'>('a4')
  const [blankOrientation, setBlankOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [processing, setProcessing] = useState(false)
  const [processingMessage, setProcessingMessage] = useState('Processing...')
  const fileLoadRequest = useRef(0)
  const operationAbort = useRef<AbortController | null>(null)
  const originalPageCount = layout.originalPages.length
  const rotations = layout.rotations
  const previewItems = useMemo<PreviewItem[]>(() => file
    ? layout.pages.map((page) => ({
        id: String(page.id),
        index: page.sourcePageIndex ?? 0,
        controlIndex: page.id,
        file,
        label: page.sourcePageIndex === null ? 'Blank page' : file.name,
        blankSize: page.blankSize,
      }))
    : [], [file, layout.pages])

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0]
    if (!f) return
    const request = ++fileLoadRequest.current
    setProcessingMessage('Opening PDF...')
    setProcessing(true)
    try {
      const [total, inspection] = await Promise.all([
        getPageCount(f),
        inspectPdfStructure(f).catch(() => null),
      ])
      if (request !== fileLoadRequest.current) return
      setFile(f)
      setStructureInspection(inspection)
      setRemovedThumbnails({})
      removedThumbnailsRef.current = {}
      dispatchLayout({ type: 'load', pageCount: total })
      setSelected(new Set())
      setPageRange('')
      setRangeMode('replace')
      setJumpPage('')
      setGoToRequest(null)
      setMovePosition('')
      setBlankPosition('')
      toast.success(`Loaded ${total} pages`)
    } catch (error) {
      if (request !== fileLoadRequest.current) return
      toast.error(describePdfError(error))
    } finally {
      if (request === fileLoadRequest.current) setProcessing(false)
    }
  }, [])
  usePendingFiles(handleFile)

  useEffect(() => {
    if (!file || layout.removed.length === 0) return
    let active = true
    layout.removed.forEach((item) => {
      if (item.page.sourcePageIndex === null || removedThumbnailsRef.current[item.page.id]) return
      void renderPageToCanvas(file, item.page.sourcePageIndex + 1, 0.25).then((thumbnail) => {
        if (active) {
          removedThumbnailsRef.current = { ...removedThumbnailsRef.current, [item.page.id]: thumbnail }
          setRemovedThumbnails(removedThumbnailsRef.current)
        }
      }).catch(() => {})
    })
    return () => { active = false }
  }, [file, layout.removed])

  const createPagePlan = useCallback((pages = layout.pages): ArrangePdfPage[] => pages.map((page) => {
    const rotation = rotations[page.id] || 0
    return page.sourcePageIndex === null
      ? { blankSize: page.blankSize!, rotation }
      : { pageIndex: page.sourcePageIndex, rotation }
  }), [layout.pages, rotations])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (processing) return
      const target = event.target
      if (target instanceof HTMLElement && (
        target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
        target.closest('[role="textbox"]')
      )) return

      const modifier = event.metaKey || event.ctrlKey
      if (!modifier) return
      if (event.key.toLowerCase() === 'z' && event.shiftKey && layout.future.length > 0) {
        event.preventDefault()
        dispatchLayout({ type: 'redo' })
      } else if (event.key.toLowerCase() === 'z' && layout.past.length > 0) {
        event.preventDefault()
        dispatchLayout({ type: 'undo' })
      } else if (event.key.toLowerCase() === 'y' && layout.future.length > 0) {
        event.preventDefault()
        dispatchLayout({ type: 'redo' })
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [layout.future.length, layout.past.length, processing])

  const togglePage = useCallback((pageIndex: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(pageIndex)) next.delete(pageIndex)
      else next.add(pageIndex)
      return next
    })
  }, [])

  const rotatePage = useCallback((pageIndex: number, direction: 1 | -1) => {
    dispatchLayout({ type: 'rotate', pageIds: [pageIndex], direction })
  }, [])

  const handleRotateSelected = (direction: 1 | -1) => {
    dispatchLayout({ type: 'rotate', pageIds: [...selected], direction })
  }

  const resetChanges = () => {
    if (!file) return
    dispatchLayout({ type: 'reset' })
    toast.success('Page layout reset')
  }

  const selectPageRange = (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const visiblePositions = parsePageRange(pageRange, previewItems.length)
      const pageIds = visiblePositions.map((position) => layout.pages[position].id)
      setSelected((current) => {
        if (rangeMode === 'replace') return new Set(pageIds)
        const next = new Set(current)
        pageIds.forEach((pageId) => rangeMode === 'add' ? next.add(pageId) : next.delete(pageId))
        return next
      })
      toast.success(`Selected ${visiblePositions.length} ${visiblePositions.length === 1 ? 'page' : 'pages'}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid page range')
    }
  }

  const selectContinuousRange = useCallback((pageIds: number[], shouldSelect: boolean) => {
    setSelected((current) => {
      const next = new Set(current)
      pageIds.forEach((pageId) => shouldSelect ? next.add(pageId) : next.delete(pageId))
      return next
    })
  }, [])

  const jumpToPage = (event: React.FormEvent) => {
    event.preventDefault()
    const pageNumber = Number(jumpPage)
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > layout.pages.length) {
      toast.error(`Page number must be between 1 and ${layout.pages.length}`)
      return
    }
    setGoToRequest((current) => ({ index: pageNumber - 1, token: (current?.token || 0) + 1 }))
  }

  const quickSelect = (mode: 'odd' | 'even' | 'invert') => {
    if (mode === 'invert') {
      setSelected(new Set(previewItems
        .filter((page) => !selected.has(page.controlIndex ?? page.index))
        .map((page) => page.controlIndex ?? page.index)))
      return
    }
    const parity = mode === 'odd' ? 0 : 1
    setSelected(new Set(previewItems
      .filter((_, position) => position % 2 === parity)
      .map((page) => page.controlIndex ?? page.index)))
  }

  const removeSelectedFromLayout = () => {
    if (selected.size === 0) return
    if (selected.size === previewItems.length) {
      toast.error('Keep at least one page in the document')
      return
    }
    const removed = selected.size
    dispatchLayout({ type: 'remove', pageIds: [...selected] })
    setSelected(new Set())
    toast.success(`${removed} ${removed === 1 ? 'page' : 'pages'} removed from the layout`)
  }

  const moveSelectedToPosition = (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const moved = moveSelectedItems(
        layout.pages,
        (page) => selected.has(page.id),
        Number(movePosition),
      )
      if (moved.every((page, index) => page.id === layout.pages[index].id)) {
        toast.success('Selected pages are already at that position')
        return
      }
      dispatchLayout({ type: 'set-order', pageIds: moved.map((page) => page.id) })
      toast.success(`Moved selected pages to position ${movePosition}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid destination')
    }
  }

  const duplicateSelected = () => {
    if (selected.size === 0) return
    dispatchLayout({ type: 'duplicate', pageIds: [...selected] })
    toast.success(`Duplicated ${selected.size} ${selected.size === 1 ? 'page' : 'pages'}`)
  }

  const restoreRemovedPage = (pageId: number) => {
    dispatchLayout({ type: 'restore-removed', pageIds: [pageId] })
    toast.success('Page restored to the layout')
  }

  const insertBlankPage = (event: React.FormEvent) => {
    event.preventDefault()
    const position = blankPosition ? Number(blankPosition) : layout.pages.length + 1
    if (!Number.isInteger(position) || position < 1 || position > layout.pages.length + 1) {
      toast.error(`Blank page position must be between 1 and ${layout.pages.length + 1}`)
      return
    }
    const base = blankFormat === 'a4' ? { width: 595, height: 842 } : { width: 612, height: 792 }
    const size = blankOrientation === 'portrait' ? base : { width: base.height, height: base.width }
    dispatchLayout({ type: 'insert-blank', position: position - 1, size })
    setBlankPosition('')
    toast.success(`Blank page inserted at position ${position}`)
  }

  const cancelProcessing = () => {
    fileLoadRequest.current++
    operationAbort.current?.abort()
    operationAbort.current = null
    setProcessing(false)
    toast.success('Operation cancelled')
  }

  const generateManagedPdf = async (options: {
    plan: ArrangePdfPage[]
    message: string
    progressVerb: string
    resultTitle: string
    filename: string
    summary: string[]
  }) => {
    if (!file) return
    const controller = new AbortController()
    operationAbort.current = controller
    setProcessingMessage(options.message)
    setProcessing(true)
    try {
      const result = await arrangePdfPages(file, options.plan, (current, total) => {
        setProcessingMessage(`${options.progressVerb} page ${current} of ${total}...`)
      }, controller.signal)
      if (controller.signal.aborted) return
      const blob = new Blob([Uint8Array.from(result).buffer], { type: 'application/pdf' })
      triggerDownloadOverlay(options.resultTitle, () => downloadBlob(blob, options.filename), options.summary)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.error('Failed to generate the edited PDF')
    } finally {
      if (operationAbort.current === controller) {
        operationAbort.current = null
        setProcessing(false)
      }
    }
  }

  const handleExtractSelected = async () => {
    if (!file || selected.size === 0) return
    await generateManagedPdf({
      plan: createPagePlan(layout.pages.filter((page) => selected.has(page.id))),
      message: `Extracting ${selected.size} ${selected.size === 1 ? 'page' : 'pages'}...`,
      progressVerb: 'Extracting',
      resultTitle: 'Pages extracted!',
      filename: `extracted-${file.name}`,
      summary: [`${selected.size} ${selected.size === 1 ? 'page' : 'pages'} in the result`],
    })
  }

  const handleDeleteSelected = async () => {
    if (!file || selected.size === 0) return
    if (selected.size === previewItems.length) {
      toast.error('Keep at least one page in the document')
      return
    }
    const outputCount = layout.pages.length - selected.size
    await generateManagedPdf({
      plan: createPagePlan(layout.pages.filter((page) => !selected.has(page.id))),
      message: `Removing ${selected.size} ${selected.size === 1 ? 'page' : 'pages'}...`,
      progressVerb: 'Preparing',
      resultTitle: 'Pages removed!',
      filename: `edited-${file.name}`,
      summary: [`${outputCount} pages in the result`, `${selected.size} removed in this download`],
    })
  }

  const handleSaveChanges = async () => {
    if (!file) return
    await generateManagedPdf({
      plan: createPagePlan(),
      message: 'Applying page changes...',
      progressVerb: 'Preparing',
      resultTitle: 'Page changes saved!',
      filename: `edited-${file.name}`,
      summary: [
        `${layout.pages.length} pages in the result`,
        `${removedByUser} removed · ${duplicatedByUser} duplicated · ${blankPages} blank`,
        `${rotatedByUser} rotated${reorderedByUser ? ' · page order changed' : ''}`,
      ],
    })
  }

  const rotatedByUser = layout.pages.filter((page) => (rotations[page.id] || 0) !== 0).length
  const originalInstances = layout.pages.filter((page) => page.id < originalPageCount)
  const reorderedByUser = originalInstances.some((page, position) => position > 0 && page.id < originalInstances[position - 1].id)
  const removedByUser = layout.removed.length
  const duplicatedByUser = layout.pages.filter((page) => page.sourcePageIndex !== null && page.id >= originalPageCount).length
  const blankPages = layout.pages.filter((page) => page.sourcePageIndex === null).length
  const hasLayoutChanges = rotatedByUser > 0 || reorderedByUser || removedByUser > 0 || duplicatedByUser > 0 || blankPages > 0
  const structureWarnings = structureInspection ? [
    structureInspection.hasDigitalSignature && 'Digital signatures may become invalid after page edits.',
    structureInspection.hasForm && 'Interactive form fields should be reviewed in the downloaded copy.',
    structureInspection.hasBookmarks && 'Bookmarks may still target their original page objects after reordering.',
    structureInspection.hasAttachments && 'Embedded attachments are preserved, but should be checked after editing.',
    structureInspection.hasPageLabels && 'Custom page labels may no longer match the visible page order.',
  ].filter((warning): warning is string => !!warning) : []

  if (!file) {
    return (
      <ToolPageWrapper>
        <ToolHeader title="Manage Pages" description="Delete, rotate, reorder, and extract PDF pages locally with a visual preview. No document upload; practical capacity depends on your device." />
        <FileUpload onFiles={handleFile} multiple={false} />
        {processing && <ProcessingOverlay message={processingMessage} onCancel={cancelProcessing} />}
      </ToolPageWrapper>
    )
  }

  return (
    <ToolPageWrapper>
      <ToolHeader title="Manage Pages" description="Select PDF pages and perform actions — free online PDF page manager." />

      <div className="p-3 mb-5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', border: '1px solid rgba(221,228,216,0.3)' }}>
        <div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.name}</span>
          <span className="text-xs text-gray-400 ml-2">
            {formatFileSize(file.size)} · {previewItems.length === originalPageCount ? `${previewItems.length} pages` : `${previewItems.length} of ${originalPageCount} pages`}
          </span>
        </div>
        <button disabled={processing} onClick={() => { fileLoadRequest.current++; setFile(null); setStructureInspection(null); setRemovedThumbnails({}); removedThumbnailsRef.current = {}; dispatchLayout({ type: 'load', pageCount: 0 }); setSelected(new Set()); setPageRange(''); setRangeMode('replace'); setJumpPage(''); setGoToRequest(null); setMovePosition(''); setBlankPosition('') }} className="btn-ghost text-xs disabled:opacity-40 disabled:cursor-not-allowed">Change file</button>
      </div>

      {structureWarnings.length > 0 && (
        <aside className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/20 p-3" aria-labelledby="pdf-structure-warning-title">
          <strong id="pdf-structure-warning-title" className="text-sm text-amber-800 dark:text-amber-300">Review document features after editing</strong>
          <ul className="mt-1 list-disc pl-5 text-xs text-amber-700 dark:text-amber-400 space-y-1">
            {structureWarnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </aside>
      )}

      <PdfViewer
        pages={previewItems}
        selected={selected}
        onToggle={togglePage}
        onSelectRange={selectContinuousRange}
        onSelectAll={() => setSelected(new Set(layout.pages.map((page) => page.id)))}
        onDeselectAll={() => setSelected(new Set())}
        rotations={rotations}
        onRotatePage={rotatePage}
        interactionDisabled={processing}
        goToRequest={goToRequest}
        headerRight={(
          <>
            <form onSubmit={selectPageRange} className="flex items-center gap-1.5" title="Select pages by their current visible positions">
              <select value={rangeMode} onChange={(event) => setRangeMode(event.target.value as 'replace' | 'add' | 'remove')}
                disabled={processing} aria-label="Page range selection mode"
                className="rounded-md border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-2 py-1 text-xs">
                <option value="replace">Replace</option>
                <option value="add">Add</option>
                <option value="remove">Remove</option>
              </select>
              <input
                type="text"
                value={pageRange}
                onChange={(event) => setPageRange(event.target.value)}
                disabled={processing}
                placeholder="1-3, 6 or all"
                aria-label="Page range"
                className="w-28 rounded-md border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-2 py-1 text-xs text-gray-700 dark:text-gray-200 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button type="submit" className="btn-secondary text-xs px-2.5 py-1" disabled={processing}>Select range</button>
            </form>
            <select
              value=""
              onChange={(event) => {
                const mode = event.target.value as 'odd' | 'even' | 'invert' | ''
                if (mode) quickSelect(mode)
              }}
              disabled={processing}
              aria-label="Quick page selection"
              className="rounded-md border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-2 py-1 text-xs text-gray-600 dark:text-gray-300 disabled:opacity-50"
            >
              <option value="">Quick select…</option>
              <option value="odd">Odd visible pages</option>
              <option value="even">Even visible pages</option>
              <option value="invert">Invert selection</option>
            </select>
            <form onSubmit={jumpToPage} className="flex items-center gap-1" title="Jump to a visible page">
              <input type="number" min={1} max={layout.pages.length} value={jumpPage}
                onChange={(event) => setJumpPage(event.target.value)} disabled={processing}
                placeholder="Page" aria-label="Go to page"
                className="w-20 rounded-md border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-2 py-1 text-xs" />
              <button type="submit" disabled={processing} className="btn-secondary text-xs px-2 py-1">Go</button>
            </form>
          </>
        )}
        onReorderPages={(from, to) => {
          dispatchLayout({ type: 'reorder', from, to })
        }}
      />

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <details className="section-card p-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-300">Insert a blank page</summary>
          <form onSubmit={insertBlankPage} className="mt-3 flex items-end gap-2 flex-wrap">
            <label className="text-xs text-gray-500">Format
              <select value={blankFormat} onChange={(event) => setBlankFormat(event.target.value as 'a4' | 'letter')} disabled={processing}
                className="mt-1 block rounded-md border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-2 py-1.5 text-xs">
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
              </select>
            </label>
            <label className="text-xs text-gray-500">Orientation
              <select value={blankOrientation} onChange={(event) => setBlankOrientation(event.target.value as 'portrait' | 'landscape')} disabled={processing}
                className="mt-1 block rounded-md border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-2 py-1.5 text-xs">
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </label>
            <label className="text-xs text-gray-500">Position
              <input type="number" min={1} max={layout.pages.length + 1} value={blankPosition}
                onChange={(event) => setBlankPosition(event.target.value)} disabled={processing}
                placeholder={`${layout.pages.length + 1}`}
                className="mt-1 block w-20 rounded-md border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-2 py-1.5 text-xs" />
            </label>
            <button type="submit" disabled={processing} className="btn-secondary text-xs py-1.5 px-2.5">Insert blank</button>
          </form>
        </details>

        {layout.removed.length > 0 && (
          <section className="section-card p-3" aria-labelledby="removed-pages-title">
            <div className="flex items-center justify-between gap-2">
              <h2 id="removed-pages-title" className="text-sm font-medium text-gray-600 dark:text-gray-300">Removed pages</h2>
              <button type="button" disabled={processing} onClick={() => dispatchLayout({ type: 'restore-removed', pageIds: layout.removed.map((item) => item.page.id) })}
                className="btn-ghost text-xs">Restore all</button>
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {layout.removed.map((item) => (
                <button key={item.page.id} type="button" disabled={processing} onClick={() => restoreRemovedPage(item.page.id)}
                  className="shrink-0 w-24 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 p-2 text-xs text-gray-600 dark:text-gray-300">
                  <span className="block h-20 rounded bg-gray-100 dark:bg-gray-900 overflow-hidden mb-1">
                    {removedThumbnails[item.page.id]
                      ? <img src={removedThumbnails[item.page.id]} alt="" className="w-full h-full object-cover" />
                      : <span className="h-full flex items-center justify-center text-[10px] text-gray-400">{item.page.sourcePageIndex === null ? 'Blank' : 'Loading…'}</span>}
                  </span>
                  {item.page.sourcePageIndex === null ? 'Blank page' : `Source ${item.page.sourcePageIndex + 1}`} · Restore
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {processing && <ProcessingOverlay message={processingMessage} onCancel={cancelProcessing} />}

      {/* Sticky action bar */}
      <div className="sticky bottom-4 mt-5 sticky-bar p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-gray-400 whitespace-nowrap" aria-live="polite">
            {selected.size > 0 ? `${selected.size} ${selected.size === 1 ? 'page' : 'pages'} selected` : 'Select pages to rotate, move, extract, or remove'}
          </span>
          {rotatedByUser > 0 && (
            <span className="text-xs text-amber-600 whitespace-nowrap">{rotatedByUser} page(s) rotated</span>
          )}
          {reorderedByUser && <span className="text-xs text-amber-600 whitespace-nowrap">Page order changed</span>}
          {removedByUser > 0 && <span className="text-xs text-amber-600 whitespace-nowrap">{removedByUser} {removedByUser === 1 ? 'page' : 'pages'} removed</span>}
          {duplicatedByUser > 0 && <span className="text-xs text-amber-600 whitespace-nowrap">{duplicatedByUser} duplicated</span>}
          {blankPages > 0 && <span className="text-xs text-amber-600 whitespace-nowrap">{blankPages} blank</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-[11px] font-medium text-gray-400 tracking-wide">ROTATE</span>
            <button onClick={() => handleRotateSelected(-1)} disabled={selected.size === 0 || processing} className="btn-secondary text-xs py-1.5 px-2.5" title="Rotate selected counter-clockwise">↺</button>
            <button onClick={() => handleRotateSelected(1)} disabled={selected.size === 0 || processing} className="btn-secondary text-xs py-1.5 px-2.5" title="Rotate selected clockwise">↻</button>
          </div>
          <form onSubmit={moveSelectedToPosition} className="flex items-center gap-1.5" title="Move selected pages as one block">
            <input
              type="number"
              min={1}
              max={Math.max(1, previewItems.length - selected.size + 1)}
              step={1}
              value={movePosition}
              onChange={(event) => setMovePosition(event.target.value)}
              disabled={processing || selected.size === 0}
              placeholder="Position"
              aria-label="Move selected pages to position"
              className="w-24 rounded-md border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button type="submit" disabled={processing || selected.size === 0} className="btn-secondary text-xs py-1.5 px-2.5">Move selected</button>
          </form>
          <button type="button" onClick={duplicateSelected} disabled={selected.size === 0 || processing}
            className="btn-secondary" title="Duplicate each selected page directly after its original">
            Duplicate selected
          </button>
          <button
            onClick={handleExtractSelected}
            disabled={selected.size === 0 || processing}
            className="btn-primary flex items-center gap-2"
          >
            {processing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            Extract &amp; Download
          </button>
          <button
            type="button"
            onClick={removeSelectedFromLayout}
            disabled={selected.size === 0 || processing}
            className="btn-secondary"
            title="Remove selected pages from this working layout; Undo can restore them"
          >
            Remove from layout
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selected.size === 0 || processing}
            className="btn-secondary"
          >
            Remove &amp; Download
          </button>
          {(layout.past.length > 0 || layout.future.length > 0) && (
            <div className="flex items-center gap-1" aria-label="Layout history">
              <button type="button" onClick={() => dispatchLayout({ type: 'undo' })} disabled={layout.past.length === 0 || processing}
                className="btn-ghost flex items-center gap-1 text-xs px-2" title="Undo layout change (Ctrl/Cmd+Z)">
                <Undo2 size={14} /> Undo
              </button>
              <button type="button" onClick={() => dispatchLayout({ type: 'redo' })} disabled={layout.future.length === 0 || processing}
                className="btn-ghost flex items-center gap-1 text-xs px-2" title="Redo layout change (Ctrl/Cmd+Shift+Z)">
                <Redo2 size={14} /> Redo
              </button>
            </div>
          )}
          {hasLayoutChanges && (
            <button
              type="button"
              onClick={resetChanges}
              disabled={processing}
              className="btn-ghost flex items-center gap-1.5 text-xs"
              title="Restore the original page order and rotations"
            >
              <RotateCcw size={14} />
              Reset layout
            </button>
          )}
          {hasLayoutChanges && (
            <button
              onClick={handleSaveChanges}
              disabled={processing}
              className="btn-primary flex items-center gap-2"
            >
              {processing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              Save &amp; Download
            </button>
          )}
        </div>
      </div>

      {/* SEO content */}
      <section className="portal-seo-copy" style={{ marginTop: '24px' }}>
        <span>FREE ONLINE PDF PAGE MANAGER</span>
        <h2>Edit PDF pages online free — delete, rotate, reorder, and extract</h2>
        <p>Manage PDF pages entirely in your browser: delete unwanted pages, rotate pages, reorder them by dragging or moving a selected block, and extract selected pages into a new PDF. No document upload or sign-up.</p>
        <div>
          <article><h3>How to edit PDF pages online for free?</h3><p>Upload your PDF, then use the visual page thumbnails to select, rotate, or reorder pages. Delete unwanted pages and download the edited PDF — all in your browser.</p></article>
          <article><h3>Is this PDF editor safe to use?</h3><p>Yes. Page management runs entirely in your browser. Files are never uploaded. Your documents stay private on your device.</p></article>
          <article><h3>Can I edit PDF pages without uploading?</h3><p>Yes. Uploading in this context means selecting a file from your device. The file content is processed in browser memory and never sent to any server.</p></article>
        </div>
      </section>
    </ToolPageWrapper>
  )
}
