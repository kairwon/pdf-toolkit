export type WatermarkAnchor = { x: number; y: number }

export const DEFAULT_WATERMARK_ANCHOR: WatermarkAnchor = { x: 0.5, y: 0.5 }

export function clampWatermarkAnchor(anchor: WatermarkAnchor): WatermarkAnchor {
  return {
    x: Math.min(1, Math.max(0, anchor.x)),
    y: Math.min(1, Math.max(0, anchor.y)),
  }
}

/** Convert a visual center anchor into the PDF draw origin, preserving center rotation. */
export function resolveWatermarkCoordinates(
  pageWidth: number,
  pageHeight: number,
  markWidth: number,
  markHeight: number,
  anchor: WatermarkAnchor,
  angle = 0,
) {
  const normalized = clampWatermarkAnchor(anchor)
  const radians = angle * Math.PI / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const rotatedHalfWidth = Math.abs(cosine) * markWidth / 2 + Math.abs(sine) * markHeight / 2
  const rotatedHalfHeight = Math.abs(sine) * markWidth / 2 + Math.abs(cosine) * markHeight / 2
  const horizontalLimit = Math.min(pageWidth / 2, rotatedHalfWidth)
  const verticalLimit = Math.min(pageHeight / 2, rotatedHalfHeight)
  const centerX = Math.min(pageWidth - horizontalLimit, Math.max(horizontalLimit, pageWidth * normalized.x))
  const centerY = Math.min(pageHeight - verticalLimit, Math.max(verticalLimit, pageHeight * (1 - normalized.y)))
  return {
    x: centerX - (cosine * markWidth / 2 - sine * markHeight / 2),
    y: centerY - (sine * markWidth / 2 + cosine * markHeight / 2),
  }
}
