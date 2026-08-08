import { Link } from 'react-router-dom'
import ArticleShell from '../components/content/ArticleShell'
import usePageTitle from '../hooks/usePageTitle'

export default function CompressWithoutQualityGuidePage() {
  usePageTitle('/guides/compress-pdf-without-losing-quality')
  return (
    <ArticleShell kicker="PDF COMPRESSION GUIDE" title="How to compress a PDF without making it unreadable" summary="Reduce PDF size deliberately by identifying what makes the file large, choosing the mildest useful method and checking the downloaded copy at the size it will actually be read." updated="8 August 2026" readingTime="9 minute read" tool={{ href: '/compress', label: 'Compress a PDF privately', note: 'Compare compression modes while the document remains in your browser.' }}>
      <section><h2>“Without losing quality” needs a practical definition</h2><p>Any meaningful reduction can change a file. The goal is not a mathematically identical PDF; it is a smaller copy that preserves the information your reader needs. A text assignment, scanned form and image portfolio have different quality thresholds. Keep the original and decide what must remain readable before changing anything.</p></section>
      <section><h2>Check what is making the PDF large</h2><ul><li>High-resolution photographs and full-page scans are common causes.</li><li>Duplicate or accidental pages add avoidable size.</li><li>Embedded fonts, complex vector drawings and transparency can contribute.</li><li>A document exported repeatedly between programs may carry unnecessary data.</li><li>A digital text PDF may already be efficient and offer little safe reduction.</li></ul></section>
      <section><h2>Use the mildest method that meets the real limit</h2><p>Start with lossless or balanced compression, then download and check the result. Use stronger image reduction only if an email or portal limit still is not met. If you know the exact maximum, use the <Link to="/compress/exact">target-size compressor</Link> and aim slightly below the limit so metadata or a later upload step does not push the file over.</p></section>
      <section><h2>Inspect the pages most likely to fail</h2><ol><li>Open the downloaded copy rather than relying on an in-app preview.</li><li>Check the first, middle and last pages.</li><li>Zoom into the smallest body text, footnotes, equations and table labels.</li><li>Inspect signatures, stamps, QR codes and thin diagram lines.</li><li>Search or select text if searchable content must be preserved.</li><li>Confirm page count, orientation and finished file size.</li></ol></section>
      <section><h2>When stronger compression is the wrong fix</h2><p>If text or diagrams become unclear, return to the original. Remove unnecessary pages, crop large blank scan margins or recreate poor source scans at a suitable resolution. Repeatedly compressing an already compressed file can compound visible damage. For a formal submission, the portal’s current instructions and the recipient’s readability requirements take priority.</p></section>
      <section><h2>Keep both versions</h2><p>Give the compressed copy a descriptive filename and retain the original separately. Do not overwrite the only copy of a thesis, signed form, portfolio or evidence document. After upload, open the submitted version from the portal when that option is available.</p></section>
    </ArticleShell>
  )
}
