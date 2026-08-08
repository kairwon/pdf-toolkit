import { Link } from 'react-router-dom'
import ArticleShell from '../components/content/ArticleShell'
import usePageTitle from '../hooks/usePageTitle'

export default function StudyPackGuidePage() {
  usePageTitle('/guides/organize-pdf-study-notes')
  return (
    <ArticleShell kicker="EXAM REVISION GUIDE" title="Organize PDF study notes into one useful revision pack" summary="Combine lecture slides, readings and your own notes without creating an enormous, confusing PDF. Use a clear topic order, remove repetition and preserve sources." updated="8 August 2026" readingTime="8 minute read" tool={{ href: '/merge', label: 'Merge and reorder PDFs', note: 'Combine selected pages and put topics into a deliberate revision order.' }}>
      <section><h2>Decide what the master PDF is for</h2><p>A revision pack should help you find and review material quickly. It does not need to contain every file from the course. Keep full readings in an archive and put high-value pages—topic summaries, core diagrams, formula sheets and selected examples—into the master pack.</p></section>
      <section><h2>Use a predictable topic order</h2><p>Choose one system and keep it consistent: syllabus order, lecture week, exam weighting or prerequisite sequence. Rename source files before merging so their order is obvious. If a module has ten topics, a filename such as <code>04-cell-signalling-notes.pdf</code> is safer than <code>notes-final-2.pdf</code>.</p></section>
      <section><h2>Clean the source files</h2><ol><li>Use <Link to="/manage">Manage pages</Link> to remove blank pages and duplicates.</li><li>Rotate pages before combining them.</li><li>Use <Link to="/split">Split PDF</Link> to extract only the chapters or slide ranges you need.</li><li>Keep citation pages when you may need to trace a quotation.</li><li>Do not remove contextual warnings from laboratory, clinical or safety material.</li></ol></section>
      <section><h2>Merge in small, verifiable groups</h2><p>Combine one topic at a time, check the page order, and then merge the topic files into a final pack. This makes it easier to fix a mistake than working with dozens of source documents in one step. Open the result and check every transition between topics.</p><div className="content-callout"><strong>Simple navigation trick</strong><p>Insert a one-page topic cover before each section in the source material. It creates a visible divider without needing advanced PDF editing.</p></div></section>
      <section><h2>Keep the pack usable on your device</h2><p>Compress the completed pack only after the order is correct. Use balanced compression and inspect diagrams and small text. If the result becomes slow to open, make one PDF per major unit instead of forcing an entire semester into a single file.</p></section>
      <section><h2>Quality-control checklist</h2><ul><li>The first page identifies the course and version date.</li><li>Topics follow the chosen order.</li><li>No pages are upside down, blank or duplicated.</li><li>Important diagrams remain readable at normal zoom.</li><li>Source names or page references are retained where needed.</li><li>The original course files are stored separately.</li></ul></section>
    </ArticleShell>
  )
}
