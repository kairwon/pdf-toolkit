export type BlankPageAnalysis = {
  inkPercent: number
  backgroundLuminance: number
}

function luminance(data: Uint8ClampedArray, offset: number) {
  return Math.round(.2126 * data[offset] + .7152 * data[offset + 1] + .0722 * data[offset + 2])
}

/** Measure grouped dark/coloured pixels while ignoring scanner dust and the outer page edge. */
export function analyzePagePixels(data: Uint8ClampedArray, width: number, height: number): BlankPageAnalysis {
  if (width < 1 || height < 1 || data.length < width * height * 4) throw new Error('Invalid page pixels')
  const inset = Math.max(1, Math.floor(Math.min(width, height) * .015))
  const histogram = new Uint32Array(256)
  let sampled = 0
  for (let y = inset; y < height - inset; y += 2) {
    for (let x = inset; x < width - inset; x += 2) {
      histogram[luminance(data, (y * width + x) * 4)]++
      sampled++
    }
  }
  const target = sampled * .85
  let cumulative = 0
  let backgroundLuminance = 255
  for (let value = 0; value < histogram.length; value++) {
    cumulative += histogram[value]
    if (cumulative >= target) { backgroundLuminance = value; break }
  }
  const darkCutoff = backgroundLuminance < 200 ? 230 : Math.min(225, backgroundLuminance - 24)
  let inkPixels = 0
  let consideredPixels = 0
  for (let y = inset; y < height - inset - 1; y += 2) {
    for (let x = inset; x < width - inset - 1; x += 2) {
      let marked = 0
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const offset = ((y + dy) * width + x + dx) * 4
          const light = luminance(data, offset)
          const chroma = Math.max(data[offset], data[offset + 1], data[offset + 2]) - Math.min(data[offset], data[offset + 1], data[offset + 2])
          if (light < darkCutoff || (chroma > 55 && light < 245)) marked++
        }
      }
      if (marked >= 2) inkPixels += marked
      consideredPixels += 4
    }
  }
  return { inkPercent: consideredPixels ? inkPixels / consideredPixels * 100 : 0, backgroundLuminance }
}

export function suggestedBlankPages<T extends { pageNumber: number; inkPercent: number }>(pages: T[], threshold: number) {
  return pages.filter((page) => page.inkPercent < threshold).map((page) => page.pageNumber)
}
