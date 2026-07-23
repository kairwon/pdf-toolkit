import { Outlet, Link } from 'react-router-dom'
import Header from './Header'
import BambooScene from '../BambooScene'
import { ShieldCheck } from 'lucide-react'

export default function Layout() {
  return (
    <div className="min-h-screen bg-scene flex flex-col relative">
      <BambooScene />
      <Header />

      {/* Privacy banner */}
      <div className="bg-jade/5 dark:bg-jade-dark/20 border-b border-jade/10 dark:border-jade-dark/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm text-jade dark:text-jade-light">
          <ShieldCheck size={14} />
          <span>
            Client-side features process files locally in your browser. Server-side features are clearly marked — see our <Link to="/privacy" className="underline underline-offset-2 hover:no-underline">Privacy Policy</Link> for details.
          </span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1 w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700/30 bg-white/50 dark:bg-black/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 dark:text-gray-500">
          <p>&copy; {new Date().getFullYear()} Lab of PDF. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Any suggestions? <a href="mailto:labofpdf@gmail.com" className="underline underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Contact us</a></span>
            <Link to="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Terms</Link>
            <Link to="/security" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Security</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
