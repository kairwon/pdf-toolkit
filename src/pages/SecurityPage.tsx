import { ArrowLeft, ShieldCheck, Lock, WifiOff, Eye, FileCode, RefreshCw, Server, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import usePageTitle from '../hooks/usePageTitle'
import ShareButtons from '../components/ui/ShareButtons'

const measures = [
  {
    icon: WifiOff,
    title: 'Client-Side Isolation',
    desc: 'For client-side features (Merge, Split, Manage, To Image, Compress, Watermark), all processing happens in your browser. Files never leave your device. This is enforced by the architecture — no backend server exists to receive them.',
  },
  {
    icon: Server,
    title: 'Server-Side Encryption (future features)',
    desc: 'When server-side features are used, files are encrypted in transit (TLS 1.3) and at rest using AES-256. Temporary storage is on isolated, ephemeral volumes that are securely wiped after processing.',
  },
  {
    icon: RefreshCw,
    title: 'Automatic Deletion',
    desc: 'Server-side uploaded files are automatically purged within 60 minutes of processing completion. No copies are retained in backups, logs, or caches. You may also request immediate deletion by closing the tab during active processing.',
  },
  {
    icon: Eye,
    title: 'No Persistent Storage',
    desc: 'Client-side data exists only in browser memory and is cleared on page refresh/close. Server-side data is never stored beyond the 60-minute processing window. No localStorage, IndexedDB, or cookies are used for content.',
  },
  {
    icon: Lock,
    title: 'Sandboxed Execution',
    desc: 'Client-side operations run inside the browser\'s security sandbox — no cross-origin access, no file system access without user consent. Server-side processing runs in containerized, isolated environments with no lateral network access.',
  },
  {
    icon: FileCode,
    title: 'Open-Source & Auditable',
    desc: 'All client-side dependencies (pdf-lib, pdfjs-dist, JSZip) are established open-source projects. The application source code is available for independent security review. Server-side components (if added) will also be open-source.',
  },
]

export default function SecurityPage() {
  usePageTitle('/security')
  const navigate = useNavigate()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-6">
          <ArrowLeft size={14} /> Back to tools
        </button>
        <ShareButtons path="/security" title="Security | Lab of PDF" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Data Security Measures</h1>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">How Lab of PDF protects your documents</p>

      <div className="flex flex-wrap items-center gap-2 mb-8">
        <span className="text-[11px] bg-jade/10 text-jade px-2.5 py-0.5 rounded-full font-medium">Client-side ready</span>
        <span className="text-[11px] bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 px-2.5 py-0.5 rounded-full font-medium">Server-side planned</span>
      </div>

      <div className="space-y-4">
        {measures.map((m) => {
          const Icon = m.icon
          const isClient = m.title === 'Client-Side Isolation' || m.title === 'Sandboxed Execution' || m.title === 'No Persistent Storage'
          const isServer = m.title === 'Server-Side Encryption' || m.title === 'Automatic Deletion'
          return (
            <div key={m.title} className="section-card p-5 flex gap-4">
              <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isClient ? 'bg-jade/10 dark:bg-jade-dark/20 text-jade dark:text-jade-light' : isServer ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{m.title}</h3>
                  {isClient && <span className="text-[10px] bg-jade/10 text-jade px-1.5 py-0.5 rounded font-medium">Active</span>}
                  {isServer && <span className="text-[10px] bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">Planned</span>}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{m.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 section-card p-5 bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30">
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          <strong>Honest disclosure.</strong> The current feature set is entirely client-side. As server-side features are added, this page and all privacy/terms documents will be updated before launch. Each server-side tool will display a clear notice before any data is transmitted.
        </p>
      </div>

      <div className="mt-4 section-card p-5 bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30">
        <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
          <strong>Compliance.</strong> This security framework is designed to meet applicable requirements under the EU General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), and US Federal Trade Commission (FTC) guidelines. See the <a href="/privacy" className="underline">Privacy Policy</a> for detailed legal references.
        </p>
      </div>
    </div>
  )
}
