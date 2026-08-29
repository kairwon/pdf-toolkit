import { useCallback, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react'

export type FileAccept = Record<string, string[]>

function matchesAccept(file: File, accept: FileAccept) {
  const fileName = file.name.toLowerCase()
  return Object.entries(accept).some(([mime, extensions]) => {
    const mimeMatches = mime.endsWith('/*') ? file.type.startsWith(mime.slice(0, -1)) : file.type === mime
    return mimeMatches || extensions.some((extension) => fileName.endsWith(extension.toLowerCase()))
  })
}

export default function useFileDrop({
  onFiles,
  multiple,
  accept,
}: {
  onFiles: (files: File[]) => void
  multiple: boolean
  accept: FileAccept
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [isDragActive, setIsDragActive] = useState(false)
  const inputAccept = useMemo(() => [...new Set(Object.entries(accept).flatMap(([mime, extensions]) => [mime, ...extensions]))].join(','), [accept])

  const chooseFiles = useCallback((incoming: File[]) => {
    const supported = incoming.filter((file) => matchesAccept(file, accept))
    if (supported.length > 0) onFiles(multiple ? supported : supported.slice(0, 1))
  }, [accept, multiple, onFiles])

  const open = useCallback(() => inputRef.current?.click(), [])
  const onInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    chooseFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }, [chooseFiles])
  const onDragEnter = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    dragDepth.current += 1
    if (event.dataTransfer.types.includes('Files')) setIsDragActive(true)
  }, [])
  const onDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])
  const onDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setIsDragActive(false)
  }, [])
  const onDrop = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    dragDepth.current = 0
    setIsDragActive(false)
    chooseFiles(Array.from(event.dataTransfer.files))
  }, [chooseFiles])
  const onRootClick = useCallback((event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button, a, input, select, textarea')) return
    open()
  }, [open])
  const onRootKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    open()
  }, [open])

  return {
    isDragActive,
    open,
    rootProps: { onClick: onRootClick, onKeyDown: onRootKeyDown, onDragEnter, onDragOver, onDragLeave, onDrop },
    inputProps: { ref: inputRef, type: 'file' as const, accept: inputAccept, multiple, onChange: onInputChange },
  }
}
