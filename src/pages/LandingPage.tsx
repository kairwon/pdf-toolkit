import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { ArrowRight, FileText, Combine, Split, Layers, Image, FileDown, Droplets, DropletOff, FileType } from 'lucide-react'
import BambooScene from '../components/BambooScene'

const defaultTools = [
  { path: '/merge', title: 'Merge PDF', desc: 'Combine multiple PDFs into one. Preview pages and pick exactly which ones to include.', icon: Combine },
  { path: '/split', title: 'Split PDF', desc: 'Extract specific pages from a PDF or split it into two separate files.', icon: Split },
  { path: '/compress', title: 'Compress PDF', desc: 'Reduce PDF file size losslessly — text stays selectable.', icon: FileDown },
  { path: '/to-word', title: 'PDF to Word', desc: 'Convert PDF to Word — OCR applied automatically to scanned pages.', icon: FileType },
  { path: '/watermark', title: 'Add Watermark', desc: 'Add a text watermark to every page of your PDF.', icon: Droplets },
  { path: '/unwatermark', title: 'Remove Watermark', desc: 'Strip overlay watermarks and cover common watermark regions.', icon: DropletOff },
  { path: '/manage', title: 'Manage Pages', desc: 'Delete, rotate, or extract pages from your PDF with a visual preview.', icon: Layers },
  { path: '/to-image', title: 'PDF to Image', desc: 'Convert PDF pages to PNG or JPEG images. Download individually or as ZIP.', icon: Image },
]

const futureTools = ['PDF to Excel', 'Edit PDF', 'Sign PDF']

export default function LandingPage() {
  const navigate = useNavigate()
  const [tools, setTools] = useState(defaultTools)

  const onDragEnd = useCallback((result: any) => {
    if (!result.destination) return
    const items = Array.from(tools)
    const [moved] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, moved)
    setTools(items)
  }, [tools])

  return (
    <div className="relative">
      <BambooScene />

      {/* Hero */}
      <div className="relative z-10 text-center pt-10 pb-6">
        <div className="inline-flex items-center gap-2 bg-jade/10 dark:bg-jade-dark/25 text-jade dark:text-jade-light text-xs font-medium px-3.5 py-1.5 rounded-full mb-4 tracking-wide">
          <FileText size={13} />
          All processing happens locally in your browser
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
          Free Online <span className="text-jade dark:text-jade-light">PDF Tools</span>
        </h1>
        <p className="text-gray-400 dark:text-gray-500 mt-2 max-w-md mx-auto text-sm leading-relaxed">
          Merge, split, compress, watermark, and convert PDFs — all in your browser. Free, private, no sign-up.
        </p>
      </div>

      <div className="relative z-10 flex items-stretch gap-2 sm:gap-4">
        {/* Tools */}
        <div className="flex-1 min-w-0">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="tools" direction="horizontal" type="TOOL">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mb-10"
                >
                  {tools.map((t, index) => (
                    <Draggable key={t.path} draggableId={t.path} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`feature-card p-3.5 text-left group relative ${snapshot.isDragging ? 'shadow-lg rotate-[1deg] scale-[1.02] z-50' : ''}`}
                          style={provided.draggableProps.style}
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="absolute top-2 right-2 p-1 rounded-md text-gray-200 dark:text-gray-600 hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-grab active:cursor-grabbing z-10"
                          >
                            <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor"><circle cx="3" cy="2" r="1.3"/><circle cx="8" cy="2" r="1.3"/><circle cx="3" cy="6" r="1.3"/><circle cx="8" cy="6" r="1.3"/><circle cx="3" cy="10" r="1.3"/><circle cx="8" cy="10" r="1.3"/></svg>
                          </div>

                          <div onClick={() => navigate(t.path)} className="cursor-pointer">
                            <div className="bg-gradient-to-br from-jade to-jade-light rounded-lg p-2 text-white inline-flex shadow-sm mb-2.5">
                              <t.icon size={16} />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-0.5">{t.title}</h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed pr-5">{t.desc}</p>
                            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-jade opacity-0 group-hover:opacity-100 transition-opacity">
                              Open tool <ArrowRight size={11} />
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Upcoming */}
          <div className="text-center mb-8">
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
      </div>
    </div>
  )
}
