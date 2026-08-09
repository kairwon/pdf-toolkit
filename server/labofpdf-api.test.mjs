import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createLabOfPdfApi } from './labofpdf-api.mjs'

const instances = []

async function startApi() {
  const directory = mkdtempSync(join(tmpdir(), 'labofpdf-api-'))
  const api = createLabOfPdfApi({
    databasePath: join(directory, 'feedback.sqlite3'),
    countersPath: join(directory, 'counters.json'),
    allowedOrigins: ['https://labofpdf.com'],
  })
  await new Promise((resolve) => api.server.listen(0, '127.0.0.1', resolve))
  const address = api.server.address()
  const item = { api, directory, baseUrl: `http://127.0.0.1:${address.port}` }
  instances.push(item)
  return item
}

afterEach(async () => {
  while (instances.length) {
    const item = instances.pop()
    await item.api.close()
    rmSync(item.directory, { recursive: true, force: true })
  }
})

describe('Lab of PDF API', () => {
  it('keeps the existing visitor and bamboo endpoints working', async () => {
    const { baseUrl } = await startApi()
    expect(await fetch(`${baseUrl}/api/health`).then((response) => response.json())).toEqual({ ok: true, feedbackStorage: 'sqlite' })
    expect(await fetch(`${baseUrl}/api/visitors/get`).then((response) => response.json())).toEqual({ value: 108 })
    expect(await fetch(`${baseUrl}/api/visitors/hit`).then((response) => response.json())).toEqual({ value: 109 })
    expect(await fetch(`${baseUrl}/api/bamboo/feed`).then((response) => response.json())).toEqual({ value: 301 })
  })

  it('stores only validated feedback fields and supports a deployment dry run', async () => {
    const { api, baseUrl } = await startApi()
    const payload = {
      tool: '/unwatermark',
      outcome: 'no',
      reason: 'watermark_remains',
      comment: 'The visible page-content mark remains.',
      releaseCommit: 'b'.repeat(40),
      durationBucket: '2-10s',
      sizeBucket: '1-5mb',
    }
    const headers = { 'Content-Type': 'application/json', Origin: 'https://labofpdf.com' }

    const dryRun = await fetch(`${baseUrl}/api/feedback`, { method: 'POST', headers: { ...headers, 'X-Feedback-Dry-Run': '1' }, body: JSON.stringify(payload) })
    expect(dryRun.status).toBe(201)
    expect(api.feedbackCount()).toBe(0)

    const stored = await fetch(`${baseUrl}/api/feedback`, { method: 'POST', headers, body: JSON.stringify(payload) })
    expect(stored.status).toBe(201)
    expect(api.feedbackCount()).toBe(1)
    const columns = api.database.prepare('PRAGMA table_info(feedback)').all().map((column) => column.name)
    expect(columns).not.toContain('ip')
    expect(columns).not.toContain('filename')
    expect(columns).not.toContain('document_content')
  })

  it('rejects cross-origin, oversized, and invalid feedback', async () => {
    const { api, baseUrl } = await startApi()
    const valid = { tool: '/compress/exact', outcome: 'yes', reason: 'result_worked' }
    const wrongOrigin = await fetch(`${baseUrl}/api/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' }, body: JSON.stringify(valid) })
    expect(wrongOrigin.status).toBe(403)

    const invalidReason = await fetch(`${baseUrl}/api/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://labofpdf.com' }, body: JSON.stringify({ ...valid, reason: 'anything' }) })
    expect(invalidReason.status).toBe(400)

    const oversized = await fetch(`${baseUrl}/api/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://labofpdf.com' }, body: JSON.stringify({ ...valid, comment: 'x'.repeat(5000) }) })
    expect(oversized.status).toBe(413)
    expect(api.feedbackCount()).toBe(0)
  })
})
