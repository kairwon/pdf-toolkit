import { Link } from 'react-router-dom'
import ArticleShell from '../components/content/ArticleShell'
import usePageTitle from '../hooks/usePageTitle'

export default function ReduceScannedPdfGuidePage() {
  usePageTitle('/guides/reduce-scanned-pdf-file-size')
  return (
    <ArticleShell kicker="SCANNED PDF GUIDE" title="How to reduce a scanned PDF file size" summary="Make a scanned PDF smaller by fixing the scan source, removing unnecessary pages and choosing image reduction that keeps handwriting, stamps and small print readable." updated="8 August 2026" readingTime="8 minute read" tool={{ href: '/compress', label: 'Compress a scanned PDF', note: 'Process supported documents locally and inspect the smaller result before using it.' }}>
      <section><h2>Why scanned PDFs become large</h2><p>A scan stores each page mainly as an image. Colour pages, high resolution, photographic backgrounds and wide blank margins can make even a short document large. OCR may add searchable text, but it usually does not remove the page image that dominates the file size.</p></section>
      <section><h2>Keep the original scan</h2><p>Work on a copy. A compressed version may be suitable for email or upload but should not replace the best available scan of a signed form, identity document, certificate or archive record. Follow the recipient’s current rules for colour, resolution and file format.</p></section>
      <section><h2>Clean the document before compression</h2><ol><li>Use <Link to="/manage">Manage pages</Link> to remove blank, accidental or duplicate pages.</li><li>Rotate pages into their final orientation.</li><li>Split out pages the recipient did not request.</li><li>If rescanning is possible, align pages and avoid capturing a large desk background.</li><li>Use grayscale for plain text only when colour carries no required information.</li></ol></section>
      <section><h2>Choose reduction based on the content</h2><p>Typed black text usually tolerates more image reduction than faint handwriting, seals, photographs or shaded diagrams. Start with balanced compression and inspect a representative page. For a strict upload maximum, move to stronger compression only when the balanced result is still too large.</p><div className="content-callout"><strong>Do not optimise only for the number</strong><p>A file below the portal limit can still fail its real purpose if names, dates, signatures or reference numbers cannot be read.</p></div></section>
      <section><h2>Verify the downloaded scan</h2><ul><li>Open it on the device you will use to submit.</li><li>Read the smallest print at normal and enlarged zoom.</li><li>Check low-contrast handwriting and every signature.</li><li>Confirm page count, order and orientation.</li><li>If OCR was used, compare names, numbers and technical notation with the image.</li><li>Confirm the finished size is below—not exactly equal to—the stated maximum.</li></ul></section>
      <section><h2>If it is still too large</h2><p>Split the document only if the portal accepts multiple files. Otherwise, rescan oversized or poorly framed pages, then combine the corrected pages and compress once. Avoid repeatedly processing the same reduced copy because each pass can make image defects more visible.</p></section>
    </ArticleShell>
  )
}
