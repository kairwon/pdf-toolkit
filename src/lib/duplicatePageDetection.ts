export type PageFingerprint = {
  bits: string
  meanLuminance: number
}

export type FingerprintedPage = {
  pageNumber: number
  fingerprint: PageFingerprint
}

export type DuplicatePageGroup = {
  pageNumbers: number[]
  similarity: number
}

function luminance(data: Uint8ClampedArray, offset: number) {
  return .2126 * data[offset] + .7152 * data[offset + 1] + .0722 * data[offset + 2]
}

/** Build a compact difference hash that is stable across resizing and mild compression. */
export function fingerprintPagePixels(data: Uint8ClampedArray, width: number, height: number): PageFingerprint {
  if (width < 1 || height < 1 || data.length < width * height * 4) throw new Error('Invalid page pixels')
  const cells = Array.from({ length: 9 }, () => Array<number>(9).fill(0))
  let total = 0
  for (let row = 0; row < 9; row++) {
    const y0 = Math.floor(row * height / 9)
    const y1 = Math.max(y0 + 1, Math.floor((row + 1) * height / 9))
    for (let column = 0; column < 9; column++) {
      const x0 = Math.floor(column * width / 9)
      const x1 = Math.max(x0 + 1, Math.floor((column + 1) * width / 9))
      let sum = 0
      let count = 0
      for (let y = y0; y < Math.min(y1, height); y++) {
        for (let x = x0; x < Math.min(x1, width); x++) {
          sum += luminance(data, (y * width + x) * 4)
          count++
        }
      }
      cells[row][column] = count ? sum / count : 255
      total += cells[row][column]
    }
  }
  let bits = ''
  for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) bits += cells[row][column] >= cells[row][column + 1] ? '1' : '0'
  for (let column = 0; column < 8; column++) for (let row = 0; row < 8; row++) bits += cells[row][column] >= cells[row + 1][column] ? '1' : '0'
  return { bits, meanLuminance: total / 81 }
}

export function fingerprintSimilarity(first: PageFingerprint, second: PageFingerprint) {
  if (first.bits.length !== second.bits.length || first.bits.length === 0) return 0
  if (Math.abs(first.meanLuminance - second.meanLuminance) > 18) return 0
  let differences = 0
  for (let index = 0; index < first.bits.length; index++) if (first.bits[index] !== second.bits[index]) differences++
  return (1 - differences / first.bits.length) * 100
}

/** Cluster visually matching pages so each page appears in at most one review group. */
export function findDuplicatePageGroups<T extends FingerprintedPage>(pages: T[], minimumSimilarity: number): DuplicatePageGroup[] {
  const parent = pages.map((_, index) => index)
  const find = (index: number): number => parent[index] === index ? index : (parent[index] = find(parent[index]))
  const join = (left: number, right: number) => { const a = find(left); const b = find(right); if (a !== b) parent[b] = a }
  const pairScores = new Map<string, number>()
  for (let left = 0; left < pages.length; left++) {
    for (let right = left + 1; right < pages.length; right++) {
      const similarity = fingerprintSimilarity(pages[left].fingerprint, pages[right].fingerprint)
      if (similarity >= minimumSimilarity) { join(left, right); pairScores.set(`${left}:${right}`, similarity) }
    }
  }
  const clusters = new Map<number, number[]>()
  pages.forEach((_, index) => { const root = find(index); clusters.set(root, [...(clusters.get(root) || []), index]) })
  return [...clusters.values()].filter((indices) => indices.length > 1).map((indices) => {
    let weakest = 100
    for (let left = 0; left < indices.length; left++) for (let right = left + 1; right < indices.length; right++) {
      weakest = Math.min(weakest, pairScores.get(`${indices[left]}:${indices[right]}`) ?? fingerprintSimilarity(pages[indices[left]].fingerprint, pages[indices[right]].fingerprint))
    }
    return { pageNumbers: indices.map((index) => pages[index].pageNumber), similarity: weakest }
  })
}
