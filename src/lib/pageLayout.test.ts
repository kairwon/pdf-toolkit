import { describe, expect, it } from 'vitest'
import { moveSelectedItems } from './pageLayout'
import { emptyPageLayoutState, pageLayoutReducer } from './pageLayoutState'

describe('moveSelectedItems', () => {
  it('moves scattered selected pages as one stable block', () => {
    const result = moveSelectedItems(
      ['A', 'B', 'C', 'D', 'E', 'F'],
      (item) => item === 'B' || item === 'E',
      3,
    )

    expect(result).toEqual(['A', 'C', 'B', 'E', 'D', 'F'])
  })

  it('moves a block to the final valid starting position', () => {
    expect(moveSelectedItems([1, 2, 3, 4], (item) => item < 3, 3)).toEqual([3, 4, 1, 2])
  })

  it('rejects missing selections and invalid destinations', () => {
    expect(() => moveSelectedItems([1, 2], () => false, 1)).toThrow('Select at least one page')
    expect(() => moveSelectedItems([1, 2, 3], (item) => item === 2, 3.5)).toThrow('whole-number destination')
    expect(() => moveSelectedItems([1, 2, 3], (item) => item === 2, 4)).toThrow('between positions 1 and 3')
  })
})

describe('pageLayoutReducer', () => {
  it('keeps remove, move, rotate, undo, and redo in one consistent history', () => {
    let state = pageLayoutReducer(emptyPageLayoutState, { type: 'load', pageCount: 5 })
    state = pageLayoutReducer(state, { type: 'remove', pageIds: [1] })
    state = pageLayoutReducer(state, { type: 'set-order', pageIds: [3, 4, 0, 2] })
    state = pageLayoutReducer(state, { type: 'rotate', pageIds: [3, 0], direction: 1 })

    expect(state.pages.map((page) => page.id)).toEqual([3, 4, 0, 2])
    expect(state.rotations).toEqual({ 0: 90, 3: 90 })
    expect(state.past).toHaveLength(3)

    state = pageLayoutReducer(state, { type: 'undo' })
    expect(state.rotations).toEqual({})
    state = pageLayoutReducer(state, { type: 'undo' })
    expect(state.pages.map((page) => page.id)).toEqual([0, 2, 3, 4])
    state = pageLayoutReducer(state, { type: 'redo' })
    expect(state.pages.map((page) => page.id)).toEqual([3, 4, 0, 2])
  })

  it('reset restores removed pages and rotations and remains undoable', () => {
    let state = pageLayoutReducer(emptyPageLayoutState, { type: 'load', pageCount: 3 })
    state = pageLayoutReducer(state, { type: 'remove', pageIds: [1] })
    state = pageLayoutReducer(state, { type: 'reorder', from: 1, to: 0 })
    state = pageLayoutReducer(state, { type: 'rotate', pageIds: [2], direction: -1 })
    state = pageLayoutReducer(state, { type: 'reset' })

    expect(state.pages.map((page) => page.id)).toEqual([0, 1, 2])
    expect(state.rotations).toEqual({})
    state = pageLayoutReducer(state, { type: 'undo' })
    expect(state.pages.map((page) => page.id)).toEqual([2, 0])
    expect(state.rotations).toEqual({ 2: 270 })
  })

  it('caps layout history and clears redo after a new edit', () => {
    let state = pageLayoutReducer(emptyPageLayoutState, { type: 'load', pageCount: 2 })
    for (let index = 0; index < 24; index++) {
      state = pageLayoutReducer(state, { type: 'rotate', pageIds: [0], direction: 1 })
    }
    expect(state.past).toHaveLength(20)
    state = pageLayoutReducer(state, { type: 'undo' })
    expect(state.future).toHaveLength(1)
    state = pageLayoutReducer(state, { type: 'rotate', pageIds: [1], direction: 1 })
    expect(state.future).toHaveLength(0)
  })

  it('gives duplicates and blank pages stable independent identities', () => {
    let state = pageLayoutReducer(emptyPageLayoutState, { type: 'load', pageCount: 2 })
    state = pageLayoutReducer(state, { type: 'rotate', pageIds: [0], direction: 1 })
    state = pageLayoutReducer(state, { type: 'duplicate', pageIds: [0] })
    state = pageLayoutReducer(state, { type: 'insert-blank', position: 2, size: { width: 595, height: 842 } })

    expect(state.pages.map((page) => page.id)).toEqual([0, 2, 3, 1])
    expect(state.pages[1].sourcePageIndex).toBe(0)
    expect(state.pages[2]).toMatchObject({ sourcePageIndex: null, blankSize: { width: 595, height: 842 } })
    expect(state.rotations).toEqual({ 0: 90, 2: 90 })
  })

  it('tracks removed page instances and restores them near their prior positions', () => {
    let state = pageLayoutReducer(emptyPageLayoutState, { type: 'load', pageCount: 4 })
    state = pageLayoutReducer(state, { type: 'remove', pageIds: [1, 3] })
    expect(state.pages.map((page) => page.id)).toEqual([0, 2])
    expect(state.removed.map((item) => item.page.id)).toEqual([1, 3])

    state = pageLayoutReducer(state, { type: 'restore-removed', pageIds: [1] })
    expect(state.pages.map((page) => page.id)).toEqual([0, 1, 2])
    expect(state.removed.map((item) => item.page.id)).toEqual([3])
  })
})
