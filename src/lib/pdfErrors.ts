export function describePdfError(error: unknown): string {
  const name = error instanceof Error ? error.name.toLowerCase() : ''
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  if (name.includes('password') || message.includes('password') || message.includes('encrypted')) {
    return 'This PDF is password-protected. Remove its password locally before editing pages.'
  }
  if (message.includes('invalid pdf') || message.includes('missing pdf header') || message.includes('corrupt')) {
    return 'This PDF appears to be damaged or is not a valid PDF file.'
  }
  if (message.includes('memory') || message.includes('allocation') || message.includes('array buffer')) {
    return 'This PDF is too large for the available browser memory on this device.'
  }
  return 'The PDF could not be opened. It may use an unsupported format or encryption method.'
}
