import { Eye, FileCode, HardDrive, LockKeyhole, Server, ShieldCheck, WifiOff } from 'lucide-react'
import usePageTitle from '../hooks/usePageTitle'

const measures = [
  { icon: WifiOff, title: 'Local PDF processing', text: 'Current PDF operations run in your browser. There is no document-upload endpoint in these workflows.' },
  { icon: HardDrive, title: 'Temporary browser memory', text: 'Files are accessed after you choose them and remain in the tab’s working memory. Closing or refreshing the page clears the active workspace.' },
  { icon: LockKeyhole, title: 'Browser sandbox', text: 'The application receives only the files you select. It does not gain general access to your device or folders.' },
  { icon: Eye, title: 'Visible external links', text: 'Official requirement sources open as ordinary links. Opening them sends a normal web request to that government website, not your PDF.' },
  { icon: FileCode, title: 'Established libraries', text: 'PDF work uses browser builds of pdf-lib, PDF.js, JSZip, and related open-source components.' },
  { icon: Server, title: 'Isolated Word conversion', text: 'Word to PDF is the documented exception: LibreOffice runs with one conversion at a time, a separate temporary profile, strict size and time limits, and request-scoped file deletion.' },
]

export default function SecurityPage() {
  usePageTitle('/security')
  return (
    <div className="legal-page">
      <span className="legal-kicker">SECURITY MODEL</span>
      <h1>How your PDFs stay private</h1>
      <p className="legal-updated">Last reviewed: 30 August 2026</p>
      <div className="legal-highlight"><ShieldCheck size={20} /><div><strong>Architecture, not a deletion promise</strong><p>Your current PDF workflows do not send the document to Lab of PDF in the first place.</p></div></div>
      <div className="security-grid">{measures.map(({ icon: Icon, title, text }) => <article key={title}><span><Icon size={18} /></span><div><h2>{title}</h2><p>{text}</p></div></article>)}</div>
      <div className="legal-content">
        <section><h2>Important limitations</h2><p>Browser processing does not make every risk disappear. Keep backups, use an up-to-date browser, avoid untrusted browser extensions, inspect downloaded files, and do not process documents on a shared or compromised device.</p></section>
        <section><h2>Responsible disclosure</h2><p>If you believe you found a security problem, send reproduction steps to <a href="mailto:labofpdf@gmail.com">labofpdf@gmail.com</a>. Do not include sensitive third-party documents.</p></section>
      </div>
    </div>
  )
}
