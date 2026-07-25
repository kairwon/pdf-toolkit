import { ArrowLeft } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import ShareButtons from './ShareButtons'

interface ToolHeaderProps {
  title: string
  description: string
}

export default function ToolHeader({ title, description }: ToolHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-3"
          >
            <ArrowLeft size={14} />
            Back to tools
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        </div>
        <div className="shrink-0 mt-2 sm:mt-9 ml-4">
          <ShareButtons path={location.pathname} title={`${title} | Lab of PDF`} />
        </div>
      </div>
    </div>
  )
}
