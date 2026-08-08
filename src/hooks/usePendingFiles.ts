import { useEffect, useRef } from 'react'
import { takePendingFiles } from '../lib/fileHandoff'

export default function usePendingFiles(onFiles: (files: File[]) => void | Promise<void>) {
  const handler = useRef(onFiles)
  handler.current = onFiles

  useEffect(() => {
    const files = takePendingFiles()
    if (files.length > 0) void handler.current(files)
  }, [])
}
