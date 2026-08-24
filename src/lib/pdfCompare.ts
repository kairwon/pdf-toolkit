import { renderPageToCanvas } from './pdf'

export interface PdfPageComparison {
  left: string
  right: string
  difference: string
  changedPercent: number
}

async function bitmapFor(dataUrl: string) {
  return createImageBitmap(await (await fetch(dataUrl)).blob())
}

/** Render two pages at the same size and highlight materially changed pixels. */
export async function comparePdfPages(leftFile: File, rightFile: File, pageNumber: number): Promise<PdfPageComparison> {
  const [left, right] = await Promise.all([
    renderPageToCanvas(leftFile, pageNumber, 1.2, 'png'),
    renderPageToCanvas(rightFile, pageNumber, 1.2, 'png'),
  ])
  const [leftBitmap, rightBitmap] = await Promise.all([bitmapFor(left), bitmapFor(right)])
  const width = Math.max(leftBitmap.width, rightBitmap.width)
  const height = Math.max(leftBitmap.height, rightBitmap.height)
  const leftCanvas = document.createElement('canvas'); leftCanvas.width = width; leftCanvas.height = height
  const rightCanvas = document.createElement('canvas'); rightCanvas.width = width; rightCanvas.height = height
  const leftContext = leftCanvas.getContext('2d', { willReadFrequently: true })!
  const rightContext = rightCanvas.getContext('2d', { willReadFrequently: true })!
  leftContext.fillStyle = '#fff'; leftContext.fillRect(0, 0, width, height); leftContext.drawImage(leftBitmap, 0, 0)
  rightContext.fillStyle = '#fff'; rightContext.fillRect(0, 0, width, height); rightContext.drawImage(rightBitmap, 0, 0)
  leftBitmap.close(); rightBitmap.close()
  const leftPixels = leftContext.getImageData(0, 0, width, height)
  const rightPixels = rightContext.getImageData(0, 0, width, height)
  const result = rightContext.createImageData(width, height)
  let changed = 0
  for (let offset = 0; offset < result.data.length; offset += 4) {
    const delta = Math.abs(leftPixels.data[offset] - rightPixels.data[offset]) + Math.abs(leftPixels.data[offset + 1] - rightPixels.data[offset + 1]) + Math.abs(leftPixels.data[offset + 2] - rightPixels.data[offset + 2])
    const isChanged = delta > 54
    if (isChanged) changed++
    const luminance = .299 * rightPixels.data[offset] + .587 * rightPixels.data[offset + 1] + .114 * rightPixels.data[offset + 2]
    result.data[offset] = isChanged ? 226 : luminance
    result.data[offset + 1] = isChanged ? 44 : luminance
    result.data[offset + 2] = isChanged ? 84 : luminance
    result.data[offset + 3] = 255
  }
  rightContext.putImageData(result, 0, 0)
  const difference = rightCanvas.toDataURL('image/png')
  leftCanvas.width = 1; rightCanvas.width = 1
  return { left, right, difference, changedPercent: changed / (width * height) * 100 }
}
