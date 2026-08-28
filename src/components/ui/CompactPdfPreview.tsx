import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Loader2 } from 'lucide-react'
import { getPageCount, renderPageToCanvas } from '../../lib/pdf'

type Props = { file: File; pageCount?: number; title?: string }

export default function CompactPdfPreview({ file, pageCount, title = 'Document preview' }: Props) {
  const [pageNumber, setPageNumber] = useState(1)
  const [totalPages, setTotalPages] = useState(pageCount ?? 0)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    setPageNumber(1)
    setTotalPages(pageCount ?? 0)
    setError(false)
    if (pageCount) return () => { active = false }
    void getPageCount(file).then((count) => { if (active) setTotalPages(count) }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [file, pageCount])

  useEffect(() => {
    if (!totalPages) return
    let active = true
    setPreview('')
    setError(false)
    void renderPageToCanvas(file, pageNumber, 0.8, 'jpeg', 0.82)
      .then((value) => { if (active) setPreview(value) })
      .catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [file, pageNumber, totalPages])

  return (
    <section className="compact-pdf-preview" aria-label={title}>
      <div className="compact-pdf-preview-surface" aria-busy={!preview && !error}>
        {preview ? <img src={preview} alt={`Preview of ${file.name}, page ${pageNumber}`} /> : error ? <span>Preview unavailable</span> : <Loader2 className="animate-spin" />}
      </div>
      <div className="compact-pdf-preview-info">
        <span className="compact-pdf-preview-label"><Eye size={15} /> LOCAL PREVIEW</span>
        <h3>{title}</h3>
        <p>Confirm the correct document, orientation, and visible content before processing. The preview is rendered only in this browser.</p>
        <div className="compact-pdf-preview-navigation" aria-label="Preview page navigation">
          <button type="button" aria-label="Previous preview page" disabled={pageNumber <= 1} onClick={() => setPageNumber((current) => current - 1)}><ChevronLeft /></button>
          <span>{totalPages ? `Page ${pageNumber} of ${totalPages}` : 'Reading pages…'}</span>
          <button type="button" aria-label="Next preview page" disabled={!totalPages || pageNumber >= totalPages} onClick={() => setPageNumber((current) => current + 1)}><ChevronRight /></button>
        </div>
      </div>
    </section>
  )
}
