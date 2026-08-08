import { Link } from 'react-router-dom'
import ArticleShell from '../components/content/ArticleShell'
import usePageTitle from '../hooks/usePageTitle'

export default function SearchableNotesGuidePage() {
  usePageTitle('/guides/make-scanned-notes-searchable')
  return (
    <ArticleShell kicker="OCR REVISION GUIDE" title="Make scanned lecture notes searchable for faster revision" summary="Turn image-only lecture scans into searchable, editable study material, then verify the OCR so recognition mistakes do not become revision mistakes." updated="8 August 2026" readingTime="9 minute read" tool={{ href: '/to-word', label: 'Convert PDF to Word with OCR', note: 'Extract text from ordinary PDFs and run browser-based OCR on scanned pages.' }}>
      <section><h2>First check whether OCR is necessary</h2><p>Open the PDF and try to select a sentence or search for a distinctive word. If search finds the word, the document already contains text and normal extraction is usually faster and more accurate. If every page behaves like one photograph, OCR is needed.</p></section>
      <section><h2>Prepare scans for better recognition</h2><ul><li>Rotate sideways pages before OCR.</li><li>Use scans with even lighting and strong contrast.</li><li>Avoid fingers, shadows, folded corners and handwriting over printed text.</li><li>Split out irrelevant covers or blank pages.</li><li>Process a short sample before committing to a large document.</li></ul></section>
      <section><h2>Convert and inspect a sample</h2><p>Use <Link to="/to-word">PDF to Word</Link> and allow OCR only when the page has no usable text layer. After conversion, compare one dense page, one page with headings and one page containing tables or formulas against the original scan.</p><div className="content-callout"><strong>OCR is a draft, not a source of truth</strong><p>Names, dates, chemical notation, equations, page headers and low-contrast words require manual checking.</p></div></section>
      <section><h2>Build a revision-friendly document</h2><ol><li>Apply consistent heading styles to lecture titles and topics.</li><li>Remove repeated headers, footers and page numbers introduced by OCR.</li><li>Keep original page references beside important quotations or diagrams.</li><li>Add short summaries in your own words after each topic.</li><li>Use descriptive terms consistently so search returns useful groups of notes.</li></ol></section>
      <section><h2>A faster search routine for exams</h2><p>Search for concept names, lecturer terminology and likely question verbs such as “compare,” “evaluate” or “define.” Collect the relevant passages into a topic outline, then return to the original scan before relying on a quotation or number. Search improves navigation; it does not replace understanding or source checking.</p></section>
      <section><h2>Privacy and large files</h2><p>Lab of PDF performs supported OCR in the browser, so the document contents are not sent to a Lab of PDF upload endpoint. OCR is computationally demanding: long, high-resolution scans may be slow or exceed browser memory. Split a very large file into topic-sized sections and keep the original scans as your reference copy.</p></section>
    </ArticleShell>
  )
}

