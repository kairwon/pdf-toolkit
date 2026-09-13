import { useState } from 'react'
import { Braces, Check, Download, Eraser, FileCheck2, FileText, FormInput, ListTree, Loader2, MessageSquare, Paperclip, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import CompactPdfPreview from '../components/ui/CompactPdfPreview'
import FileUpload from '../components/ui/FileUpload'
import ProcessingOverlay from '../components/ui/ProcessingOverlay'
import ToolHeader from '../components/ui/ToolHeader'
import ToolPageWrapper from '../components/ui/ToolPageWrapper'
import usePageTitle from '../hooks/usePageTitle'
import { cleanPdfPrivacy, inspectPdfPrivacy, type PdfPrivacyInspection } from '../lib/pdfLazy'
import { downloadBlob, formatFileSize, triggerDownloadOverlay } from '../lib/utils'

export default function PrivacyCleanerPage() {
  usePageTitle('/clean-pdf-metadata')
  const [file, setFile] = useState<File | null>(null)
  const [inspection, setInspection] = useState<PdfPrivacyInspection | null>(null)
  const [removeComments, setRemoveComments] = useState(true)
  const [processing, setProcessing] = useState(false)

  const handleFiles = async (files: File[]) => {
    const source = files[0]
    if (!source) return
    try {
      const result = await inspectPdfPrivacy(source)
      setFile(source); setInspection(result); setRemoveComments(result.commentCount > 0)
    } catch { toast.error('This PDF could not be inspected') }
  }

  const reset = () => { setFile(null); setInspection(null); setRemoveComments(true) }

  const clean = async () => {
    if (!file || !inspection) return
    setProcessing(true)
    try {
      const result = await cleanPdfPrivacy(file, { removeComments })
      const blob = new Blob([Uint8Array.from(result.bytes).buffer], { type: 'application/pdf' })
      triggerDownloadOverlay('Private copy created!', () => downloadBlob(blob, `privacy-cleaned-${file.name}`), [
        'Document metadata and automatic actions removed',
        'Attachments, bookmarks, and page labels removed',
        result.flattenedFields ? `${result.flattenedFields} form ${result.flattenedFields === 1 ? 'field' : 'fields'} flattened` : 'No form fields found',
        removeComments ? `${result.removedComments} ${result.removedComments === 1 ? 'comment' : 'comments'} removed` : 'Comments kept by your choice',
      ])
    } catch { toast.error('The private copy could not be created') }
    finally { setProcessing(false) }
  }

  if (!file || !inspection) return <ToolPageWrapper><ToolHeader title="Clean PDF Metadata and Private Data" description="Inspect hidden document information, attachments, automatic actions, comments, and forms before creating a cleaner shareable copy." /><FileUpload onFiles={handleFiles} multiple={false} title="a PDF" note="Deep local inspection · no upload · original stays unchanged" /></ToolPageWrapper>

  const metadataCount = inspection.metadataFields.length + Number(inspection.hasXmpMetadata)
  const automaticItems = [
    { icon: FileText, label: 'Document metadata', detail: metadataCount ? `${metadataCount} metadata ${metadataCount === 1 ? 'entry' : 'entries'} found` : 'No named metadata found', found: metadataCount > 0 },
    { icon: Paperclip, label: 'Embedded attachments', detail: inspection.hasAttachments ? 'Embedded files found' : 'No embedded files found', found: inspection.hasAttachments },
    { icon: Braces, label: 'Scripts and automatic actions', detail: inspection.hasAutomaticActions ? 'Automatic action structures found' : 'No automatic actions found', found: inspection.hasAutomaticActions },
    { icon: ListTree, label: 'Bookmarks and page labels', detail: inspection.hasBookmarks || inspection.hasPageLabels ? 'Navigation structures found' : 'No navigation structures found', found: inspection.hasBookmarks || inspection.hasPageLabels },
    { icon: FormInput, label: 'Interactive form fields', detail: inspection.formFieldCount ? `${inspection.formFieldCount} ${inspection.formFieldCount === 1 ? 'field' : 'fields'} will be flattened` : 'No form fields found', found: inspection.formFieldCount > 0 },
  ]

  return <ToolPageWrapper>
    <ToolHeader title="Clean PDF Metadata and Private Data" description="Review what was found. The cleaner rebuilds visible pages into a new PDF and removes document-level private or active structures." />
    <div className="blank-file-bar"><div><FileCheck2 /><span><strong>{file.name}</strong><small>{formatFileSize(file.size)} · {inspection.pageCount} pages</small></span></div><button className="btn-ghost" onClick={reset} disabled={processing}>Change file</button></div>
    {inspection.hasDigitalSignature && <div className="editor-danger-note">This PDF appears digitally signed. Creating a cleaned copy will invalidate the existing digital signature.</div>}

    <div className="privacy-workspace">
      <CompactPdfPreview file={file} pageCount={inspection.pageCount} title="Original PDF preview" />
      <section className="privacy-clean-panel">
        <span className="privacy-kicker"><ShieldCheck />LOCAL PRIVACY INSPECTION</span>
        <h2>What the cleaned copy will remove</h2>
        <p>These document-level structures are removed automatically. Visible page text and images remain editable and searchable where the source allows.</p>
        <div className="privacy-scan-grid">{automaticItems.map(({ icon: Icon, label, detail, found }) => <article className={found ? 'is-found' : ''} key={label}><Icon /><span><strong>{label}</strong><small>{detail}</small></span><em>{found ? 'REMOVE' : <Check />}</em></article>)}</div>
        <label className="privacy-comment-choice"><input type="checkbox" checked={removeComments} disabled={!inspection.commentCount || processing} onChange={(event) => setRemoveComments(event.target.checked)} /><MessageSquare /><span><strong>Remove comments and review annotations</strong><small>{inspection.commentCount ? `${inspection.commentCount} removable ${inspection.commentCount === 1 ? 'annotation' : 'annotations'} found. Embedded-file annotations are always removed; ordinary links are kept unless they run JavaScript.` : 'No removable comments or review annotations found.'}</small></span></label>
        <div className="privacy-rebuild-note"><Eraser /><p><strong>Deep rebuild</strong><span>The new copy excludes attachments, metadata, bookmarks, page labels, document scripts, and automatic actions. Form appearances are kept but fields become non-editable.</span></p></div>
        <button className="btn-primary privacy-clean-button" onClick={() => void clean()} disabled={processing}>{processing ? <Loader2 className="animate-spin" /> : <Download />}Create private copy</button>
      </section>
    </div>
    {processing && <ProcessingOverlay message="Rebuilding a cleaner PDF…" />}

    <section className="tool-faq"><h2>Clean a PDF before sharing</h2><div><article><h3>What gets removed?</h3><p>The rebuilt copy drops standard document metadata, XMP metadata, embedded files, bookmarks, page labels, JavaScript name trees, automatic actions, and interactive form structures.</p></article><article><h3>Does visible content change?</h3><p>Visible text, images, and page order are copied without rasterizing the whole document. Forms are flattened so their visible values remain but fields are no longer editable.</p></article><article><h3>Is this forensic anonymization?</h3><p>No. Always inspect the finished PDF before sharing. Visible names, account numbers, signatures, redactions, and information drawn on a page need separate review.</p></article></div></section>
  </ToolPageWrapper>
}
