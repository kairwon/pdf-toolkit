import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText } from 'lucide-react'
import { cn } from '../../lib/utils'

interface FileUploadProps {
  onFiles: (files: File[]) => void
  multiple?: boolean
  accept?: Record<string, string[]>
  title?: string
  note?: string
}

export default function FileUpload({ onFiles, multiple = true, accept, title = 'PDF files', note = 'PDF files · processed on this device · no account required' }: FileUploadProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onFiles(accepted)
    },
    [onFiles],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple,
    accept: accept ?? { 'application/pdf': ['.pdf'] },
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'tool-file-upload relative cursor-pointer text-center transition-all duration-300',
        isDragActive
          ? 'border-jade bg-jade/10 dark:bg-jade-dark/20 scale-[1.02]'
          : 'border-gray-200 dark:border-gray-700 hover:border-jade/50 dark:hover:border-jade/50 hover:bg-white/80 dark:hover:bg-white/10',
      )}
      style={{ width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-3">
        {isDragActive ? (
          <div className="bg-gradient-to-br from-jade to-jade-light rounded-2xl p-4 text-white shadow-lg shadow-jade/30 animate-bounce">
            <Upload size={36} />
          </div>
        ) : (
          <div className="bg-jade/10 dark:bg-jade-dark/20 rounded-2xl p-4 text-jade dark:text-jade-light">
            <FileText size={36} />
          </div>
        )}

        <div>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {isDragActive ? 'Drop your files here' : `Drag & drop ${title} here`}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">or click anywhere in this area to browse</p>
          <p className="tool-upload-note">{note}</p>
        </div>

        {!multiple && (
          <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">
            Single file only
          </span>
        )}
      </div>
    </div>
  )
}
