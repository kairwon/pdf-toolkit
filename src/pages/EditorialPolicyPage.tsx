import { Link } from 'react-router-dom'
import ArticleShell from '../components/content/ArticleShell'
import usePageTitle from '../hooks/usePageTitle'

export default function EditorialPolicyPage() {
  usePageTitle('/editorial-policy')
  return (
    <ArticleShell kicker="EDITORIAL METHOD" title="How Lab of PDF reviews practical content" summary="Our pages are written to help someone complete a specific document task. This is the method we use to test instructions, separate facts from advice, and correct mistakes." updated="8 August 2026" readingTime="5 minute read" reviewed={false}>
      <section><h2>What our content is for</h2><p>Lab of PDF publishes instructions that support the tools on this site: preparing documents for upload portals, checking university submissions, organizing visa files, converting scans and managing PDF pages. We do not publish unrelated articles simply to attract traffic.</p></section>
      <section><h2>Our review sequence</h2><ol><li><strong>Define the real outcome.</strong> We start with the user’s constraint, such as a 5 MB portal limit or an unsearchable scan.</li><li><strong>Test the current workflow.</strong> A reviewer follows the instructions using the production interface and representative, non-sensitive sample files.</li><li><strong>Check the result.</strong> We verify file type, size, page order, text readability and download behavior where relevant.</li><li><strong>Review privacy claims.</strong> Statements about local processing are checked against the current application architecture.</li><li><strong>Add limits and failure cases.</strong> We explain when compression cannot reach a target, when OCR may make mistakes, and when an official requirement must take priority.</li></ol></section>
      <section><h2>Sources and official requirements</h2><p>For general PDF technique, we rely primarily on direct product testing. For university, government or visa requirements, the applicant must follow the current instructions on the official portal. Requirements change, so our guides avoid presenting one institution’s limit as a universal rule.</p></section>
      <section><h2>Authors, reviewers and conflicts</h2><p>Content is authored under the transparent team name “Lab of PDF editorial team.” We do not invent individual biographies, academic titles or professional certifications. Product and privacy review is performed against the current Lab of PDF interface and architecture. Read the <Link to="/about/editorial-team">author and reviewer explanation</Link>.</p></section>
      <section><h2>Updates and corrections</h2><p>Every guide carries an updated date. We review a page when its related tool changes, when a material error is reported, or when an instruction no longer matches common portal behavior. To report a problem, email <a href="mailto:labofpdf@gmail.com?subject=Content%20correction">labofpdf@gmail.com</a> with the page URL and the step that needs correction. Do not attach confidential documents.</p></section>
      <section><h2>What review does not mean</h2><p>Our content is practical product guidance, not legal, immigration, academic, financial or cybersecurity advice. A successful PDF check does not guarantee that an institution will accept an application. The official submission instructions remain authoritative.</p></section>
    </ArticleShell>
  )
}

