export class PageRangeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PageRangeError'
  }
}

/** Parse one-based page positions such as "1-3, 6, 9-10". */
export function parsePageRange(value: string, pageCount: number): number[] {
  const input = value.trim().toLowerCase()
  if (!input) throw new PageRangeError('Enter a page range, for example 1-3, 6')
  if (pageCount < 1) throw new PageRangeError('This document has no pages to select')
  if (input === 'all') return Array.from({ length: pageCount }, (_, index) => index)

  const positions = new Set<number>()
  for (const part of input.split(',')) {
    const token = part.trim()
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token)
    if (!match) throw new PageRangeError(`“${token || part}” is not a valid page or range`)

    const start = Number(match[1])
    const end = Number(match[2] ?? match[1])
    if (start < 1 || end < 1) throw new PageRangeError('Page numbers start at 1')
    if (start > end) throw new PageRangeError(`Range ${start}-${end} must run from a lower page to a higher page`)
    if (end > pageCount) throw new PageRangeError(`This PDF has only ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`)

    for (let page = start; page <= end; page++) positions.add(page - 1)
  }

  return [...positions].sort((left, right) => left - right)
}
