import usePageTitle from '../hooks/usePageTitle'

const tools = ['Merge, split, and manage pages', 'Compress and Portal‑Ready PDF', 'Visa document pack', 'PDF to image and PDF to Word', 'Add and remove supported watermark overlays']

export default function PrivacyPage() {
  usePageTitle('/privacy')
  return (
    <div className="legal-page">
      <span className="legal-kicker">PLAIN-LANGUAGE PRIVACY NOTICE</span>
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated: 30 August 2026</p>
      <div className="legal-highlight"><strong>The short version</strong><p>Your PDF files are processed in browser memory. Lab of PDF does not receive, store, or inspect their contents.</p></div>
      <div className="legal-content">
        <section><h2>1. Document processing</h2><p>The following current tools run locally with JavaScript and open-source browser libraries:</p><ul>{tools.map((item) => <li key={item}>{item}</li>)}</ul><p>Selecting a file gives your browser temporary access to it. The file is not automatically uploaded to Lab of PDF. Refreshing or closing the tab clears working data held in memory.</p></section>
        <section><h2>2. Word to PDF exception</h2><p>The Word to PDF tool clearly asks before uploading a selected DOC or DOCX file. If you start that conversion, the document is sent over HTTPS to the Lab of PDF server, processed by LibreOffice in a uniquely created temporary directory, returned as a PDF, and deleted after the request succeeds, fails, or times out. The document and generated PDF are not written to the feedback database, analytics, application backups, or the public website. Do not use this server-assisted tool for material that you are not permitted to transmit.</p></section>
        <section><h2>3. Data the website may receive</h2><p>Like most hosted websites, the hosting and security infrastructure may receive basic request information such as IP address, browser type, requested URL, timestamp, and error or security logs. This information may be processed for delivery, abuse prevention, reliability, and legal compliance. Document contents are not included in ordinary page requests.</p></section>
        <section><h2>4. Optional result feedback</h2><p>After downloading a result, you may choose to tell us whether it solved your problem. If you respond, we store the tool used, yes or no outcome, selected reason, optional short comment, time, and website release version. We do not include your PDF, file name, document contents, or IP address in the feedback database. Please do not enter personal or document information in the optional comment.</p></section>
        <section><h2>5. Browser storage</h2><p>We use localStorage or sessionStorage for necessary device-local preferences, including your privacy choice. These values do not contain PDF contents, document names, or extracted text.</p></section>
        <section><h2>6. Analytics and advertising</h2><p>Advertising scripts are currently disabled in this release. Privacy-friendly traffic measurement may record page visits without receiving your PDF contents. If Google AdSense or additional analytics is enabled later, this notice will be updated before activation and optional storage will be controlled through an appropriate consent mechanism where required.</p></section>
        <section><h2>7. Your choices</h2><p>Result feedback is optional. You can also keep optional technologies off, change your privacy choice from the footer, clear this site’s browser storage, or use browser controls to block storage. Necessary storage may be required to remember your preference.</p><button className="legal-choice-button" onClick={() => window.dispatchEvent(new Event('open-privacy-settings'))}>Open privacy choices</button></section>
        <section><h2>8. Legal rights</h2><p>Depending on where you live, you may have rights to access, correct, delete, restrict, or object to processing of personal information received by the website. PDF documents used with local tools never reach Lab of PDF. Word documents sent to the converter are deleted after the request and cannot later be retrieved through the service.</p></section>
        <section><h2>9. Children</h2><p>The service is a general-purpose document utility and is not directed to children under 13. Do not use it to submit personal information to us about a child.</p></section>
        <section><h2>10. Contact</h2><p>Questions and privacy requests can be sent to <a href="mailto:labofpdf@gmail.com">labofpdf@gmail.com</a>. The site operator should add its legal name and mailing address here before commercial launch if required by its jurisdiction or advertising partner.</p></section>
      </div>
    </div>
  )
}
