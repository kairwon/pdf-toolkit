export type BlankPageSize = { width: number; height: number }

export type ManagedPage = {
  id: number
  sourcePageIndex: number | null
  blankSize?: BlankPageSize
}

export type RemovedManagedPage = {
  page: ManagedPage
  position: number
}

export type PageLayoutSnapshot = {
  pages: ManagedPage[]
  removed: RemovedManagedPage[]
  rotations: Record<number, number>
}

export type PageLayoutState = PageLayoutSnapshot & {
  originalPages: ManagedPage[]
  nextId: number
  past: PageLayoutSnapshot[]
  future: PageLayoutSnapshot[]
}

export type PageLayoutAction =
  | { type: 'load'; pageCount: number }
  | { type: 'rotate'; pageIds: number[]; direction: 1 | -1 }
  | { type: 'reorder'; from: number; to: number }
  | { type: 'set-order'; pageIds: number[] }
  | { type: 'remove'; pageIds: number[] }
  | { type: 'restore-removed'; pageIds: number[] }
  | { type: 'duplicate'; pageIds: number[] }
  | { type: 'insert-blank'; position: number; size: BlankPageSize }
  | { type: 'reset' }
  | { type: 'undo' }
  | { type: 'redo' }

const MAX_LAYOUT_HISTORY = 20

export const emptyPageLayoutState: PageLayoutState = {
  originalPages: [],
  pages: [],
  removed: [],
  rotations: {},
  nextId: 0,
  past: [],
  future: [],
}

function clonePage(page: ManagedPage): ManagedPage {
  return { ...page, blankSize: page.blankSize ? { ...page.blankSize } : undefined }
}

function cloneRemoved(item: RemovedManagedPage): RemovedManagedPage {
  return { page: clonePage(item.page), position: item.position }
}

function snapshot(state: PageLayoutState): PageLayoutSnapshot {
  return {
    pages: state.pages.map(clonePage),
    removed: state.removed.map(cloneRemoved),
    rotations: { ...state.rotations },
  }
}

function sameIds(left: ManagedPage[], right: ManagedPage[]) {
  return left.length === right.length && left.every((page, index) => page.id === right[index].id)
}

function sameSnapshot(state: PageLayoutState, next: PageLayoutSnapshot) {
  if (!sameIds(state.pages, next.pages)) return false
  if (state.removed.length !== next.removed.length || state.removed.some((item, index) => (
    item.page.id !== next.removed[index].page.id || item.position !== next.removed[index].position
  ))) return false
  const rotationKeys = new Set([...Object.keys(state.rotations), ...Object.keys(next.rotations)])
  return [...rotationKeys].every((key) => (state.rotations[Number(key)] || 0) === (next.rotations[Number(key)] || 0))
}

function recordChange(
  state: PageLayoutState,
  next: PageLayoutSnapshot,
  nextId = state.nextId,
): PageLayoutState {
  if (sameSnapshot(state, next)) return state
  return {
    ...state,
    pages: next.pages.map(clonePage),
    removed: next.removed.map(cloneRemoved),
    rotations: { ...next.rotations },
    nextId,
    past: [...state.past.slice(-(MAX_LAYOUT_HISTORY - 1)), snapshot(state)],
    future: [],
  }
}

export function pageLayoutReducer(state: PageLayoutState, action: PageLayoutAction): PageLayoutState {
  switch (action.type) {
    case 'load': {
      const originalPages = Array.from({ length: action.pageCount }, (_, id) => ({ id, sourcePageIndex: id }))
      return {
        originalPages,
        pages: originalPages.map(clonePage),
        removed: [],
        rotations: {},
        nextId: action.pageCount,
        past: [],
        future: [],
      }
    }
    case 'rotate': {
      if (action.pageIds.length === 0) return state
      const rotations = { ...state.rotations }
      action.pageIds.forEach((pageId) => {
        const rotation = (((rotations[pageId] || 0) + action.direction * 90) % 360 + 360) % 360
        if (rotation === 0) delete rotations[pageId]
        else rotations[pageId] = rotation
      })
      return recordChange(state, { pages: state.pages, removed: state.removed, rotations })
    }
    case 'reorder': {
      if (action.from === action.to) return state
      if (action.from < 0 || action.from >= state.pages.length || action.to < 0 || action.to >= state.pages.length) return state
      const pages = [...state.pages]
      const [moved] = pages.splice(action.from, 1)
      pages.splice(action.to, 0, moved)
      return recordChange(state, { pages, removed: state.removed, rotations: state.rotations })
    }
    case 'set-order': {
      const pagesById = new Map(state.pages.map((page) => [page.id, page]))
      const pages = action.pageIds.map((id) => pagesById.get(id)).filter((page): page is ManagedPage => !!page)
      if (pages.length !== state.pages.length) return state
      return recordChange(state, { pages, removed: state.removed, rotations: state.rotations })
    }
    case 'remove': {
      const removeIds = new Set(action.pageIds)
      if (removeIds.size === 0 || removeIds.size >= state.pages.length) return state
      const removed = [...state.removed]
      state.pages.forEach((page, position) => {
        if (removeIds.has(page.id)) removed.push({ page: clonePage(page), position })
      })
      const pages = state.pages.filter((page) => !removeIds.has(page.id))
      return recordChange(state, { pages, removed, rotations: state.rotations })
    }
    case 'restore-removed': {
      const restoreIds = new Set(action.pageIds)
      if (restoreIds.size === 0) return state
      const restoring = state.removed.filter((item) => restoreIds.has(item.page.id)).sort((a, b) => a.position - b.position)
      if (restoring.length === 0) return state
      const pages = [...state.pages]
      restoring.forEach((item) => pages.splice(Math.min(item.position, pages.length), 0, clonePage(item.page)))
      const removed = state.removed.filter((item) => !restoreIds.has(item.page.id))
      return recordChange(state, { pages, removed, rotations: state.rotations })
    }
    case 'duplicate': {
      const duplicateIds = new Set(action.pageIds)
      if (duplicateIds.size === 0) return state
      let nextId = state.nextId
      const rotations = { ...state.rotations }
      const pages = state.pages.flatMap((page) => {
        if (!duplicateIds.has(page.id)) return [page]
        const duplicate = clonePage({ ...page, id: nextId++ })
        if (rotations[page.id]) rotations[duplicate.id] = rotations[page.id]
        return [page, duplicate]
      })
      return recordChange(state, { pages, removed: state.removed, rotations }, nextId)
    }
    case 'insert-blank': {
      const position = Math.max(0, Math.min(action.position, state.pages.length))
      const blank: ManagedPage = { id: state.nextId, sourcePageIndex: null, blankSize: { ...action.size } }
      const pages = [...state.pages]
      pages.splice(position, 0, blank)
      return recordChange(state, { pages, removed: state.removed, rotations: state.rotations }, state.nextId + 1)
    }
    case 'reset':
      return recordChange(state, { pages: state.originalPages, removed: [], rotations: {} })
    case 'undo': {
      const previous = state.past.at(-1)
      if (!previous) return state
      return {
        ...state,
        pages: previous.pages.map(clonePage),
        removed: previous.removed.map(cloneRemoved),
        rotations: { ...previous.rotations },
        past: state.past.slice(0, -1),
        future: [snapshot(state), ...state.future].slice(0, MAX_LAYOUT_HISTORY),
      }
    }
    case 'redo': {
      const next = state.future[0]
      if (!next) return state
      return {
        ...state,
        pages: next.pages.map(clonePage),
        removed: next.removed.map(cloneRemoved),
        rotations: { ...next.rotations },
        past: [...state.past.slice(-(MAX_LAYOUT_HISTORY - 1)), snapshot(state)],
        future: state.future.slice(1),
      }
    }
  }
}
