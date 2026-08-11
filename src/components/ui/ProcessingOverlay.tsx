import { Loader2 } from 'lucide-react'

interface ProcessingOverlayProps {
  message?: string
  onCancel?: () => void
}

export default function ProcessingOverlay({
  message = 'Processing...',
  onCancel,
}: ProcessingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="section-card p-8 flex flex-col items-center gap-4">
        <Loader2 size={32} className="text-jade animate-spin" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{message}</p>
        {onCancel && <button type="button" onClick={onCancel} className="btn-secondary text-xs">Cancel</button>}
      </div>
    </div>
  )
}
