import { describe, expect, it } from 'vitest'
import { describePdfError } from './pdfErrors'

describe('describePdfError', () => {
  it('distinguishes password, damaged-file, and memory failures', () => {
    expect(describePdfError(new Error('PasswordException'))).toContain('password-protected')
    expect(describePdfError(new Error('Invalid PDF structure'))).toContain('damaged')
    expect(describePdfError(new Error('Array buffer allocation failed'))).toContain('browser memory')
  })

  it('uses a safe fallback without exposing internal errors', () => {
    expect(describePdfError(new Error('unexpected implementation detail'))).toBe('The PDF could not be opened. It may use an unsupported format or encryption method.')
  })
})
