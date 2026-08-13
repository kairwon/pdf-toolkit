import { describe, expect, it } from 'vitest'
import { buildVisiblePagePlan } from './pageExportPlan'

describe('buildVisiblePagePlan', () => {
  it('preserves visible order and rotation for selected pages', () => {
    const pages = [
      { index: 2, rotation: 90 },
      { index: 0, rotation: 270 },
      { index: 1, rotation: 0 },
    ]
    expect(buildVisiblePagePlan(pages, new Set([0, 2]), true)).toEqual([
      { pageIndex: 2, rotation: 90 },
      { pageIndex: 0, rotation: 270 },
    ])
  })

  it('keeps unselected pages in their visible order', () => {
    const pages = [{ index: 3 }, { index: 1 }, { index: 2 }, { index: 0 }]
    expect(buildVisiblePagePlan(pages, new Set([1, 2]), false)).toEqual([
      { pageIndex: 3, rotation: 0 },
      { pageIndex: 0, rotation: 0 },
    ])
  })
})
