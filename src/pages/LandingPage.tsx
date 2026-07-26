import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileText, Combine, Split, Layers, Image, FileDown, Droplets, DropletOff, FileType, GraduationCap, Briefcase, FileSignature, Mail, BookOpen, FileCheck } from 'lucide-react'
import PandaCard from '../components/PandaCard'
import usePageTitle from '../hooks/usePageTitle'

const categories = [
  { key: 'merge', label: 'Merge', icon: Combine },
  { key: 'split', label: 'Split', icon: Split },
  { key: 'compress', label: 'Compress', icon: FileDown },
  { key: 'to-word', label: 'To Word', icon: FileType },
  { key: 'watermark', label: 'Watermark', icon: Droplets },
  { key: 'unwatermark', label: 'Un-Watermark', icon: DropletOff },
  { key: 'manage', label: 'Manage', icon: Layers },
  { key: 'to-image', label: 'To Image', icon: Image },
]

const scenes: Record<string, { title: string; icon: any; desc: string; path: string; badge?: string }[]> = {
  merge: [
    { title: 'Merge All Pages', icon: Combine, desc: 'Combine multiple PDFs into one document', path: '/merge' },
    { title: 'Contract Merge', icon: FileSignature, desc: 'Merge signed contract pages into one PDF', path: '/merge', badge: 'Popular' },
    { title: 'Lecture Notes', icon: BookOpen, desc: 'Combine course handouts into a study guide', path: '/merge' },
    { title: 'Invoice Merge', icon: FileCheck, desc: 'Merge multiple invoices for submission', path: '/merge' },
  ],
  split: [
    { title: 'Extract Pages', icon: Split, desc: 'Extract specific pages from a PDF', path: '/split' },
    { title: 'Thesis Chapters', icon: GraduationCap, desc: 'Split a thesis into individual chapters', path: '/split', badge: 'Hot' },
    { title: 'Bank Statement', icon: Briefcase, desc: 'Extract specific months from a statement', path: '/split' },
    { title: 'Email Attachment', icon: Mail, desc: 'Split large PDFs for email size limits', path: '/split' },
  ],
  compress: [
    { title: 'Standard Compress', icon: FileDown, desc: 'Reduce PDF file size losslessly', path: '/compress' },
    { title: 'Thesis & Paper', icon: GraduationCap, desc: 'Compress to ≤5MB for university submission', path: '/compress', badge: 'Popular' },
    { title: 'Visa Application', icon: Briefcase, desc: 'Meet embassy file size requirements', path: '/compress' },
    { title: 'Email Attachment', icon: Mail, desc: 'Shrink PDF for Gmail/Outlook limits', path: '/compress' },
  ],
  'to-word': [
    { title: 'PDF to Word', icon: FileType, desc: 'Convert PDF to editable Word document', path: '/to-word' },
    { title: 'Scanned Document', icon: FileText, desc: 'OCR conversion for scanned PDF pages', path: '/to-word', badge: 'OCR' },
  ],
  watermark: [
    { title: 'Add Watermark', icon: Droplets, desc: 'Add text watermark to every page', path: '/watermark' },
    { title: 'Draft Stamp', icon: FileSignature, desc: 'Mark document as "DRAFT — NOT FINAL"', path: '/watermark' },
    { title: 'Copyright', icon: FileCheck, desc: 'Add © copyright notice to your work', path: '/watermark' },
  ],
  unwatermark: [
    { title: 'Remove Watermark', icon: DropletOff, desc: 'Strip overlay watermarks from PDF', path: '/unwatermark' },
  ],
  manage: [
    { title: 'Manage Pages', icon: Layers, desc: 'Delete, rotate, reorder PDF pages', path: '/manage' },
    { title: 'Delete Pages', icon: Layers, desc: 'Remove unwanted pages from your PDF', path: '/manage' },
    { title: 'Rotate Pages', icon: Layers, desc: 'Fix scanned pages with wrong orientation', path: '/manage' },
  ],
  'to-image': [
    { title: 'PDF to Image', icon: Image, desc: 'Convert PDF pages to PNG or JPEG', path: '/to-image' },
    { title: 'Slides to Images', icon: Image, desc: 'Convert presentation slides to images', path: '/to-image' },
  ],
}

const popularScenes = [
  { title: 'Compress for Thesis', icon: GraduationCap, desc: 'Under 5MB for university submission', path: '/compress', color: '#059669' },
  { title: 'Merge Contracts', icon: FileSignature, desc: 'Combine signed pages into one file', path: '/merge', color: '#10b981' },
  { title: 'Split Bank Statement', icon: Briefcase, desc: 'Extract specific months', path: '/split', color: '#0ea5e9' },
  { title: 'PDF to Word OCR', icon: FileType, desc: 'Convert scanned documents', path: '/to-word', color: '#8b5cf6' },
  { title: 'Visa PDF Compress', icon: Briefcase, desc: 'Meet embassy requirements', path: '/compress', color: '#f59e0b' },
  { title: 'Email Attachment', icon: Mail, desc: 'Shrink PDF for Gmail', path: '/compress', color: '#ef4444' },
]

const futureTools = ['PDF to Excel', 'Edit PDF', 'Sign PDF']

export default function LandingPage() {
  usePageTitle('/')
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  return (
    <div className="relative">

      {/* Hero */}
      <div className="relative z-10 text-center pt-4 pb-4">
        <div className="inline-flex items-center gap-2 bg-jade/10 dark:bg-jade-dark/25 text-jade dark:text-jade-light text-xs font-medium px-3.5 py-1.5 rounded-full mb-4 tracking-wide">
          <FileText size={13} />
          All processing happens locally in your browser
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
          Free Online <span className="text-jade dark:text-jade-light">PDF Tools</span>
        </h1>
        <p className="text-gray-400 dark:text-gray-500 mt-1 text-sm leading-relaxed">
          No upload, no sign-up, no limits — private &amp; free.
        </p>
      </div>

      {/* Main layout: sidebar + content */}
      <div className="relative z-10 flex gap-4 items-start">

        {/* ─── LEFT SIDEBAR ─── */}
        <div className="shrink-0 w-[120px] sm:w-[140px] pt-1">
          <div style={{
            background: 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(5,150,105,0.15)',
            borderRadius: '16px',
            padding: '8px 6px',
            position: 'sticky',
            top: '80px',
          }}>
            <div className="flex flex-col gap-0.5">
            {categories.map((cat) => {
              const Icon = cat.icon
              const isActive = activeCategory === cat.key
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(isActive ? null : cat.key)}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 10px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#fff' : '#6b7280',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    border: 'none',
                    background: isActive
                      ? 'linear-gradient(135deg, #059669, #10b981)'
                      : 'transparent',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <Icon size={15} style={{ color: isActive ? '#fff' : '#9ca3af' }} />
                  <span>{cat.label}</span>
                </button>
              )
            })}
            </div>
          </div>
        </div>

        {/* ─── RIGHT CONTENT ─── */}
        <div className="flex-1 min-w-0">

          {activeCategory ? (
            /* Scene cards for selected category */
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 capitalize">
                  {activeCategory.replace('-', ' ')} PDF
                </h2>
                <button
                  onClick={() => {
                    const cat = categories.find(c => c.key === activeCategory)
                    if (cat) navigate('/' + activeCategory)
                  }}
                  className="text-xs text-jade font-medium hover:underline"
                >
                  Open generic tool →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(scenes[activeCategory] || []).map((scene, i) => {
                  const Icon = scene.icon
                  return (
                    <div
                      key={i}
                      onClick={() => navigate(scene.path)}
                      className="scene-card flex items-start gap-3"
                    >
                      <div className="bg-gradient-to-br from-jade to-jade-light rounded-lg p-2 text-white shrink-0 shadow-sm">
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">{scene.title}</h3>
                          {scene.badge && (
                            <span className="text-[10px] bg-jade/10 text-jade px-1.5 py-0.5 rounded font-medium">{scene.badge}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{scene.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Popular / default view — scene cards + tool grid */
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 tracking-wide">
                🔥 Popular Use Cases
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
                {popularScenes.map((scene, i) => {
                  const Icon = scene.icon
                  return (
                    <div
                      key={i}
                      onClick={() => navigate(scene.path)}
                      className="scene-card flex items-center gap-3"
                    >
                      <div
                        className="rounded-lg p-2 text-white shrink-0 shadow-sm"
                        style={{ background: scene.color }}
                      >
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-semibold text-gray-800 dark:text-white/90">{scene.title}</h3>
                        <p className="text-[10px] text-gray-400 mt-0.5">{scene.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 tracking-wide">
                🔧 All Tools
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mb-4">
                {categories.map((cat, index) => {
                  const Icon = cat.icon
                  return (
                    <div
                      key={cat.key}
                      onClick={() => navigate('/' + cat.key)}
                      className="feature-card p-3 text-left group relative cursor-pointer"
                    >
                      <div className="bg-gradient-to-br from-jade to-jade-light rounded-lg p-2.5 text-white inline-flex shadow-sm mb-2.5">
                        <Icon size={18} />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-0.5 capitalize">{cat.label} PDF</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed pr-4">Free, private, no upload</p>
                      <div className="flex items-center gap-1 mt-2 text-xs font-medium text-jade opacity-0 group-hover:opacity-100 transition-opacity">
                        Open tool <ArrowRight size={11} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      <PandaCard />

      {/* Upcoming */}
      <div className="text-center mt-6 mb-4">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3.5">
          More tools coming soon
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {futureTools.map((name) => (
            <span key={name} className="text-sm text-gray-400 dark:text-gray-500 bg-white/70 dark:bg-[#1a1a30]/70 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700/50 backdrop-blur-sm">{name}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
