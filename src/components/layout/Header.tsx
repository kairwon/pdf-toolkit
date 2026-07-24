import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'

const navGroups = [
  {
    label: 'Organize',
    links: [
      { path: '/merge', label: 'Merge' },
      { path: '/split', label: 'Split' },
      { path: '/manage', label: 'Manage' },
    ],
  },
  {
    label: 'Convert',
    links: [
      { path: '/to-word', label: 'To Word' },
      { path: '/to-image', label: 'To Image' },
      { path: '/compress', label: 'Compress' },
    ],
  },
  {
    label: 'Protect',
    links: [
      { path: '/watermark', label: 'Watermark' },
      { path: '/unwatermark', label: 'Un-Watermark' },
    ],
  },
]

export default function Header() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdown, setDropdown] = useState<string | null>(null)

  return (
    <header className="sticky top-0 z-50 nav-glass">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src="/logo.png" alt="Lab of PDF" className="w-10 h-10 rounded-xl" />
          <span className="font-semibold text-base text-gray-800 dark:text-white/90">
            Lab of PDF
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-0">
          <Link to="/" className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 mr-1',
            location.pathname === '/'
              ? 'bg-jade/10 text-jade dark:bg-jade-dark/20 dark:text-jade-light'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5',
          )}>Home</Link>

          {navGroups.map((g) => (
            <div key={g.label} className="relative" onMouseEnter={() => setDropdown(g.label)} onMouseLeave={() => setDropdown(null)}>
              <button className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-1',
                g.links.some((l) => location.pathname === l.path)
                  ? 'bg-jade/10 text-jade dark:bg-jade-dark/20 dark:text-jade-light'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5',
              )}>
                {g.label} <ChevronDown size={12} />
              </button>
              {dropdown === g.label && (
                <div className="absolute top-full left-0 mt-0.5 w-44 bg-white dark:bg-[#1a1a2e] rounded-xl shadow-lg border border-gray-100 dark:border-gray-700/50 py-1.5 backdrop-blur-lg">
                  {g.links.map((l) => (
                    <Link key={l.path} to={l.path} onClick={() => setDropdown(null)}
                      className={cn(
                        'block px-4 py-2 text-sm transition-colors',
                        location.pathname === l.path
                          ? 'text-jade font-medium bg-jade/5'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5',
                      )}>
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <button className="sm:hidden p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="sm:hidden border-t border-gray-100 dark:border-white/5 p-3 flex flex-col gap-1 bg-white/95 dark:bg-[#1a1a30]/95 backdrop-blur-lg">
          <Link to="/" onClick={() => setMobileOpen(false)} className={cn('px-3 py-2 rounded-lg text-sm font-medium', location.pathname === '/' ? 'bg-jade/10 text-jade' : 'text-gray-500')}>Home</Link>
          {navGroups.map((g) => (
            <div key={g.label}>
              <p className="px-3 pt-2 pb-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">{g.label}</p>
              {g.links.map((l) => (
                <Link key={l.path} to={l.path} onClick={() => setMobileOpen(false)}
                  className={cn('block px-3 py-2 rounded-lg text-sm font-medium', location.pathname === l.path ? 'bg-jade/10 text-jade' : 'text-gray-500')}>
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </header>
  )
}
