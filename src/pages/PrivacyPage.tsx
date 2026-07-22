import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-6">
        <ArrowLeft size={14} /> Back to tools
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">Last updated: July 2026</p>

      <div className="space-y-6 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">1. Data Processing — Client-Side Features</h2>
          <p>The following features execute entirely in your browser using JavaScript. When you use these tools, no files, document contents, or metadata are transmitted to any server, API, or third-party service:</p>
          <ul className="list-disc list-inside mt-1.5 space-y-0.5 text-gray-500 dark:text-gray-400">
            <li>PDF Merge</li>
            <li>PDF Split</li>
            <li>Page Management (delete, rotate, extract)</li>
            <li>PDF to Image conversion</li>
            <li>Compress PDF (lossless rebuild)</li>
            <li>Add Watermark</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">2. Data Processing — Server-Side Features</h2>
          <p>Some future features may require server-side processing (e.g., PDF to Word / Excel conversion, AI-powered analysis). For those features:</p>
          <ul className="list-disc list-inside mt-1.5 space-y-0.5 text-gray-500 dark:text-gray-400">
            <li>Files are uploaded to a temporary, encrypted processing server</li>
            <li>Files are automatically deleted from the server within 60 minutes of processing completion</li>
            <li>No file content is permanently stored, logged, or used for model training</li>
            <li>Server-side features are clearly marked with a badge in the tool interface</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">3. No Cookies or Tracking (GDPR Art. 5, ePrivacy)</h2>
          <p>We do not use cookies, localStorage, sessionStorage, or any form of persistent identifier for tracking. No analytics, advertising networks, or third-party scripts are loaded. Your visit is anonymous. This complies with the ePrivacy Directive and GDPR Article 5 (minimisation).</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">4. Legal Basis for Processing (GDPR Art. 6)</h2>
          <p>For client-side features: no personal data is processed, so no legal basis is required. For server-side features (if added), the legal basis is your consent (Art. 6(1)(a)), obtained through a clear opt-in dialog before any upload occurs.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">5. Data Retention & Deletion (GDPR Art. 17 — Right to Erasure)</h2>
          <p>Client-side: data exists only in browser memory and is cleared on page refresh or close. Server-side: uploaded files are automatically purged within 60 minutes. You may request immediate deletion by closing the browser tab during processing. No backups, logs, or caches retain your documents.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">6. Data Transfers (GDPR Art. 44–49, US Compliance)</h2>
          <p>Client-side features involve no data transfer. If server-side features are introduced, processing servers are hosted within the United States (for US users) or the European Economic Area (for EU users), and appropriate Standard Contractual Clauses (SCCs) will be in place for any cross-border data flow. This satisfies both GDPR adequacy requirements and US federal standards.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">7. US Regulatory Compliance — CCPA, CALOPPA, FTC</h2>
          <p>Under the California Consumer Privacy Act (CCPA) as amended by CPRA, Lab of PDF does not "sell" or "share" any personal information — we collect none. The California Online Privacy Protection Act (CALOPPA) requires us to disclose how we respond to Do Not Track signals; we honour DNT by default as no tracking infrastructure exists. Under Section 5 of the FTC Act, all processing claims made on this site are truthful and non-misleading, with clear distinctions between client-side and server-side features.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">8. Changes to This Policy</h2>
          <p>Material changes will be announced via a banner on the site. Continued use after changes constitutes acceptance of the updated policy.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">9. Contact & Data Controller</h2>
          <p>For privacy inquiries or data deletion requests, contact the site maintainer via the project repository. The data controller is the site operator; for server-side features a Data Processing Agreement (DPA) is available on request.</p>
        </section>
      </div>
    </div>
  )
}
