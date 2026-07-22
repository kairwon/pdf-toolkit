import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ToolHeaderProps {
  title: string
  description: string
}

export default function ToolHeader({ title, description }: ToolHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="mb-8">
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
  )
}
