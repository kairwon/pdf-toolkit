export class PageLayoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PageLayoutError'
  }
}

/** Move selected items as one stable block to a one-based final position. */
export function moveSelectedItems<T>(
  items: T[],
  isSelected: (item: T) => boolean,
  targetPosition: number,
): T[] {
  const selected = items.filter(isSelected)
  if (selected.length === 0) throw new PageLayoutError('Select at least one page to move')
  if (!Number.isInteger(targetPosition)) throw new PageLayoutError('Enter a whole-number destination')

  const remaining = items.filter((item) => !isSelected(item))
  const lastStartPosition = remaining.length + 1
  if (targetPosition < 1 || targetPosition > lastStartPosition) {
    throw new PageLayoutError(`The selected block can start between positions 1 and ${lastStartPosition}`)
  }

  const destination = targetPosition - 1
  return [
    ...remaining.slice(0, destination),
    ...selected,
    ...remaining.slice(destination),
  ]
}
