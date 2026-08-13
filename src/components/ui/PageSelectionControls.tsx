import { useState } from 'react'
import { toast } from 'sonner'
import { parsePageRange } from '../../lib/pageRanges'

interface PageSelectionControlsProps {
  pageIds: number[]
  selected: Set<number>
  onChange: (selected: Set<number>) => void
  disabled?: boolean
}

export default function PageSelectionControls({ pageIds, selected, onChange, disabled = false }: PageSelectionControlsProps) {
  const [range, setRange] = useState('')

  const applyRange = () => {
    try {
      const positions = parsePageRange(range, pageIds.length)
      onChange(new Set(positions.map((position) => pageIds[position])))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid page range')
    }
  }

  const selectPositions = (predicate: (position: number) => boolean) => {
    onChange(new Set(pageIds.filter((_, position) => predicate(position))))
  }

  return (
    <div className="page-selection-controls" aria-label="Page selection tools">
      <form onSubmit={(event) => { event.preventDefault(); applyRange() }}>
        <label htmlFor="page-selection-range">Pages</label>
        <input id="page-selection-range" value={range} disabled={disabled} onChange={(event) => setRange(event.target.value)} placeholder="1-5, 8, 12-14" />
        <button type="submit" className="btn-secondary" disabled={disabled}>Select range</button>
      </form>
      <div>
        <button type="button" className="btn-ghost" disabled={disabled} onClick={() => selectPositions((position) => position % 2 === 0)}>Odd</button>
        <button type="button" className="btn-ghost" disabled={disabled} onClick={() => selectPositions((position) => position % 2 === 1)}>Even</button>
        <button type="button" className="btn-ghost" disabled={disabled} onClick={() => onChange(new Set(pageIds.filter((id) => !selected.has(id))))}>Invert</button>
      </div>
    </div>
  )
}
