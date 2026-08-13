import { Download, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'
import ArticleShell from '../components/content/ArticleShell'
import usePageTitle from '../hooks/usePageTitle'

const checks = [
  ['Confirm the official requirements', 'Record the accepted file type, maximum size, page limit, naming rule, deadline, and whether multiple files are allowed.'],
  ['Keep an untouched original', 'Work from a copy so you can recover searchable text, signatures, colour, or image quality if an edit goes wrong.'],
  ['Open the final downloaded file', 'Do not rely on the editor preview. Open the exact file you intend to submit in a separate PDF reader.'],
  ['Check page count and order', 'Inspect the first, middle, and last pages; confirm that no blank, duplicate, upside-down, or missing pages remain.'],
  ['Verify readability at normal zoom', 'Check small print, equations, tables, diagrams, stamps, signatures, reference numbers, and QR codes.'],
  ['Test searchable text when required', 'Try selecting a sentence and searching for a distinctive word. OCR output should be compared with the original.'],
  ['Check the finished file size', 'Aim slightly below the portal limit and measure the downloaded copy, not the source file.'],
  ['Use a clear, permitted filename', 'Follow the recipient’s naming rule and avoid ambiguous versions such as final-final-2.pdf.'],
  ['Recheck signatures and forms', 'Page rewriting can invalidate digital signatures or flatten interactive features. Confirm them in the final copy.'],
  ['Upload early enough to verify', 'Leave time to download the portal receipt or reopen the uploaded file before the deadline.'],
] as const

export default function PdfSubmissionChecklistPage() {
  usePageTitle('/guides/pdf-submission-checklist')

  return (
    <ArticleShell
      kicker="PRINTABLE PDF CHECKLIST"
      title="PDF submission checklist: 10 checks before you upload"
      summary="A format-neutral checklist for university, visa, government, job, grant, and client portals. Print it, save the text version, or link to it from your own submission instructions."
      updated="13 August 2026"
      readingTime="6 minute read"
      tool={{ href: '/portal-ready-pdf', label: 'Prepare a portal-ready PDF', note: 'Check size, pages, and practical upload requirements while the document stays on your device.' }}
    >
      <p>This checklist is designed for the last stage of a document workflow, when a technically valid PDF can still fail because it is too large, incorrectly named, missing pages, unreadable, or different from the file that was reviewed. The receiving organization’s current instructions always take priority.</p>

      <div className="checklist-actions">
        <button type="button" onClick={() => window.print()}><Printer size={17} /> Print checklist</button>
        <a href="/pdf-submission-checklist.txt" download><Download size={17} /> Download text version</a>
      </div>

      <h2>Before submitting the PDF</h2>
      <ol className="submission-checklist">
        {checks.map(([title, detail]) => (
          <li key={title}><p><strong>{title}</strong><span>{detail}</span></p></li>
        ))}
      </ol>

      <h2>Fast verification sequence</h2>
      <p>If time is short, verify the requirement, open the final downloaded file, inspect the first/middle/last pages, check the file size, and confirm the filename. For signed, scanned, or form-based documents, also inspect signatures, small text, stamps, and completed fields.</p>

      <h2>Why a portal may reject a valid PDF</h2>
      <ul>
        <li>The file is below the displayed limit in decimal MB but above a limit measured in binary MiB.</li>
        <li>The PDF opens locally but contains a damaged object or unsupported interactive feature.</li>
        <li>The browser uploaded an older copy with the same filename.</li>
        <li>A digital signature became invalid after pages were reordered, removed, or compressed.</li>
        <li>The recipient requires PDF/A, searchable text, a specific page size, or a naming convention.</li>
      </ul>

      <div className="reference-note">
        <h2>Link to this checklist</h2>
        <p>Universities, application advisers, libraries, student-support teams, and documentation writers may link directly to this page as a neutral pre-upload checklist. Please describe it accurately as a general verification aid, not as a replacement for official portal instructions.</p>
        <p><strong>Suggested reference:</strong> <Link to="/guides/pdf-submission-checklist">Lab of PDF — PDF submission checklist</Link></p>
      </div>
    </ArticleShell>
  )
}
