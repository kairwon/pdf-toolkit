import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import usePageTitle from '../hooks/usePageTitle'
import ShareButtons from '../components/ui/ShareButtons'

export default function TermsPage() {
  usePageTitle('/terms')
  const navigate = useNavigate()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-6">
          <ArrowLeft size={14} /> Back to tools
        </button>
        <ShareButtons path="/terms" title="Terms of Service | Lab of PDF" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">Last updated: July 2026</p>

      <div className="space-y-6 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">1. Acceptance of Terms</h2>
          <p>By accessing and using Lab of PDF, you agree to these Terms. If you do not agree, do not use the service.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">2. Service Scope</h2>
          <p>Lab of PDF provides PDF manipulation tools. Client-side features (Merge, Split, Manage, To Image, Compress, Watermark) run entirely in your browser — no files leave your device. Future server-side features (e.g. PDF to Word, AI analysis) require temporary file upload and will be clearly labelled. Server-side processing is offered on an opt-in basis only.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">3. User Responsibilities</h2>
          <p>You are solely responsible for:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>The legality and ownership of any documents you process</li>
            <li>Not processing documents containing unlawful content</li>
            <li>Maintaining backups of important files before processing</li>
            <li>Not using the service to bypass copyright, DRM, or access controls</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">4. Disclaimer of Warranties</h2>
          <p>The service is provided "as is" without warranty. We do not guarantee uninterrupted availability, error-free output, or suitability for a particular purpose. Client-side processing depends on your browser capabilities; server-side processing depends on network conditions.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">5. Limitation of Liability</h2>
          <p>To the maximum extent permitted by applicable law (including the EU Digital Services Act and US state law), Lab of PDF and its contributors shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of this service, including data loss or business interruption.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">6. Intellectual Property</h2>
          <p>All documents you process remain your property. We claim no ownership. The application code and interface are provided under open-source licensing terms. You may not reverse-engineer, redistribute, or resell the service without written permission.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">7. Acceptable Use (DSA Compliance)</h2>
          <p>You agree not to use the service for any unlawful activity, including but not limited to fraud, identity theft, malware distribution, or violation of intellectual property rights. Violations may result in service access being terminated without notice.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">8. Governing Law & Dispute Resolution</h2>
          <p>These terms are governed by the laws of the jurisdiction in which the service operator is based. For EU users, mandatory consumer protection rights under your local law remain unaffected. Any disputes shall first be attempted to be resolved through informal negotiation; if unresolved, they shall be submitted to the competent courts of the operator's jurisdiction.</p>
        </section>
      </div>
    </div>
  )
}
