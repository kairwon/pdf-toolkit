import { Link } from 'react-router-dom'
import ArticleShell from '../components/content/ArticleShell'
import usePageTitle from '../hooks/usePageTitle'

export default function EditorialTeamPage() {
  usePageTitle('/about/editorial-team')
  return (
    <ArticleShell kicker="AUTHOR & REVIEWER DISCLOSURE" title="Who writes and reviews Lab of PDF content" summary="We use a team byline because the guides are created and maintained as product documentation. Here is exactly what that byline means—and what it does not mean." updated="8 August 2026" readingTime="4 minute read" reviewed={false}>
      <section><h2>Lab of PDF editorial team</h2><p>This byline identifies the people maintaining the Lab of PDF product and its supporting documentation. The work includes researching common document problems, testing the website’s current workflows, writing clear steps and updating pages when the interface changes.</p><p>We currently use a team identity instead of presenting a fictional named expert. That is more honest than attaching credentials the project cannot substantiate.</p></section>
      <section><h2>Product and privacy review</h2><p>A product review checks that labels, buttons, outputs and limitations described in an article match the current website. A privacy review checks claims such as “processed in your browser” against the actual workflow. It does not certify a user’s device, browser extensions or network environment.</p></section>
      <section><h2>How expertise is demonstrated</h2><ul><li>Instructions are connected to working tools rather than abstract advice.</li><li>Guides include checkpoints that let readers verify the result themselves.</li><li>Known failure cases—OCR mistakes, unreadable compression and changing portal rules—are stated openly.</li><li>Technical and privacy claims link to our <Link to="/security">security model</Link> and <Link to="/privacy">privacy policy</Link>.</li><li>Our complete review process is public in the <Link to="/editorial-policy">editorial policy</Link>.</li></ul></section>
      <section><h2>Contact and corrections</h2><p>Questions about an article or correction requests can be sent to <a href="mailto:labofpdf@gmail.com">labofpdf@gmail.com</a>. Include the page URL and enough detail to reproduce the issue, but never email passports, bank statements, theses or other confidential PDFs.</p></section>
    </ArticleShell>
  )
}

