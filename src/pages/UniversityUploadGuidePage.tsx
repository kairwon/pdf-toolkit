import { Link } from 'react-router-dom'
import ArticleShell from '../components/content/ArticleShell'
import usePageTitle from '../hooks/usePageTitle'

export default function UniversityUploadGuidePage() {
  usePageTitle('/guides/compress-pdf-for-university-upload')
  return (
    <ArticleShell kicker="UNIVERSITY PDF GUIDE" title="How to reduce a PDF for a university submission portal" summary="A dependable workflow for getting a thesis, assignment or supporting document below an exact upload limit while keeping it readable and checking the final file before submission." updated="8 August 2026" readingTime="8 minute read" tool={{ href: '/compress/exact', label: 'Compress to an exact size', note: 'Enter the portal limit, create a smaller copy and check whether the result fits.' }}>
      <section><h2>Start with the portal, not the compressor</h2><p>Write down the exact maximum size, accepted file type and whether the portal expects one combined PDF or several separate documents. A limit shown as 10 MB may be enforced differently from 10,000 KB. Aim slightly below the stated maximum so metadata or a later save does not push the file over.</p></section>
      <section><h2>Before you reduce the file</h2><ol><li>Keep the original PDF in a separate folder.</li><li>Open it and check the title page, page order, diagrams, signatures and references.</li><li>Remove accidental blank pages or duplicates with <Link to="/manage">Manage PDF pages</Link>.</li><li>If several documents must become one file, arrange them first with <Link to="/merge">Merge PDF</Link>.</li><li>Use a clear filename that follows the institution’s convention.</li></ol></section>
      <section><h2>Choose the least destructive reduction</h2><p>Begin with a balanced setting. Text-heavy PDFs often shrink well without visible changes, while image-heavy scans need stronger image reduction. Maximum compression can make charts, small footnotes and scanned signatures difficult to read, so do not judge quality from file size alone.</p><div className="content-callout"><strong>Useful target</strong><p>For a 5 MB limit, aim around 4.7–4.9 MB rather than exactly 5.00 MB.</p></div></section>
      <section><h2>Verify the downloaded PDF</h2><ul><li>Confirm the downloaded filename and file size.</li><li>Open the new file, not the browser preview of the original.</li><li>Check the first, middle and last pages.</li><li>Zoom into tables, equations, diagrams and signatures.</li><li>Search for a phrase to confirm text is still searchable when that matters.</li><li>Confirm page count and orientation.</li></ul></section>
      <section><h2>If the PDF still exceeds the limit</h2><p>Remove unnecessary pages, crop oversized scan margins at the source, or rescan photographs at a sensible resolution. Repeatedly compressing an already compressed file can damage readability without saving much space. If the portal permits separate files, splitting may preserve more quality than forcing everything into one tiny PDF.</p></section>
      <section><h2>Final submission checklist</h2><p>Use the institution’s official instructions as the final authority. Upload the verified copy, wait for the portal to finish processing, preview it if the portal offers that option, and save the confirmation receipt. Lab of PDF can check the document; it cannot guarantee acceptance by a university system.</p></section>
    </ArticleShell>
  )
}

