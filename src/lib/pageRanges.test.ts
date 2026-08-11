import { describe, expect, it } from 'vitest'
import { parsePageRange } from './pageRanges'

describe('parsePageRange', () => {
  it('parses individual pages, ranges, whitespace, and duplicates', () => {
    expect(parsePageRange('1-3, 3, 6, 9 - 10', 12)).toEqual([0, 1, 2, 5, 8, 9])
  })

  it('supports selecting the whole visible document', () => {
    expect(parsePageRange('ALL', 4)).toEqual([0, 1, 2, 3])
  })

  it.each([
    ['', 'Enter a page range'],
    ['0', 'Page numbers start at 1'],
    ['5-3', 'must run from a lower page'],
    ['2, nope', 'not a valid page or range'],
    ['1-8', 'only 6 pages'],
  ])('rejects invalid range %s', (value, message) => {
    expect(() => parsePageRange(value, 6)).toThrow(message)
  })
})
