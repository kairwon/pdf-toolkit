import usePageTitle from '../hooks/usePageTitle'

export default function TermsPage() {
  usePageTitle('/terms')
  return (
    <div className="legal-page">
      <span className="legal-kicker">TERMS OF USE</span>
      <h1>Terms of Service</h1>
      <p className="legal-updated">Last updated: 27 July 2026</p>
      <div className="legal-content">
        <section><h2>1. Agreement</h2><p>By using Lab of PDF, you agree to these terms. If you do not agree, do not use the service.</p></section>
        <section><h2>2. What the service provides</h2><p>Lab of PDF provides browser-based tools for preparing and modifying PDF files. Current document workflows run locally on your device. Portal limits and checks are informational aids and may change at the source.</p></section>
        <section><h2>3. Your documents</h2><p>You retain ownership of your documents. You must have the right to process them and are responsible for complying with copyright, privacy, confidentiality, employment, immigration, university, and other applicable obligations.</p></section>
        <section><h2>4. Prohibited use</h2><p>Do not use the service for fraud, identity theft, unlawful surveillance, malware, infringement, bypassing access controls, or processing material you are not authorized to handle. The watermark tool must not be used to misrepresent ownership or authenticity.</p></section>
        <section><h2>5. Submission responsibility</h2><p>The service does not provide legal, immigration, academic, or professional advice. It does not guarantee that a government, university, employer, or other portal will accept a document. Always verify the current instructions, open the output, and keep a backup before submitting.</p></section>
        <section><h2>6. Availability and warranties</h2><p>The service is provided “as is” and “as available.” To the extent permitted by law, no warranty is made that processing will be uninterrupted, error-free, lossless, or suitable for a particular submission. Browser and device limitations can affect results.</p></section>
        <section><h2>7. Liability</h2><p>To the extent permitted by applicable law, Lab of PDF is not liable for indirect, incidental, special, or consequential loss, including rejected submissions, missed deadlines, lost data, or business interruption. Nothing in these terms excludes rights or liability that cannot legally be excluded.</p></section>
        <section><h2>8. Changes</h2><p>Tools and terms may be updated as the service evolves. The revision date above identifies the current version.</p></section>
        <section><h2>9. Contact</h2><p>Questions can be sent to <a href="mailto:labofpdf@gmail.com">labofpdf@gmail.com</a>. Before commercial launch, the operator should add its legal identity and governing-law jurisdiction.</p></section>
      </div>
    </div>
  )
}
