import { Outlet, Link } from 'react-router-dom'
import Header from './Header'
import BambooScene from '../BambooScene'
import DownloadOverlay from '../DownloadOverlay'
import { ShieldCheck } from 'lucide-react'

export default function Layout() {
  return (
    <div className="min-h-screen bg-scene flex flex-col relative">
      <BambooScene />
      <Header />
      <DownloadOverlay />

      {/* Privacy banner */}
      <div className="bg-jade/5 dark:bg-jade-dark/20 border-b border-jade/10 dark:border-jade-dark/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm text-jade dark:text-jade-light">
          <ShieldCheck size={14} />
          <span>
            Client-side features process files locally in your browser. Server-side features are clearly marked — see our <Link to="/privacy" className="underline underline-offset-2 hover:no-underline">Privacy Policy</Link> for details.
          </span>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex-1 w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700/30 bg-white/50 dark:bg-black/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600 dark:text-gray-300">
          <p className="text-gray-600 dark:text-gray-300">&copy; {new Date().getFullYear()} Lab of PDF. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Any suggestions? <a href="mailto:labofpdf@gmail.com" className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white underline underline-offset-2 transition-colors">Contact us</a></span>
            <Link to="/privacy" className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms" className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors">Terms</Link>
            <Link to="/security" className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors">Security</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
