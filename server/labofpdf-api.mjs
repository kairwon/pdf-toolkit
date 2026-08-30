import http from 'node:http'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, join } from 'node:path'
import { spawn } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import { pathToFileURL } from 'node:url'

const DEFAULT_DB_PATH = '/var/lib/labofpdf/feedback.sqlite3'
const DEFAULT_COUNTERS_PATH = '/var/lib/labofpdf/counters.json'
const MAX_BODY_BYTES = 4096
const MAX_WORD_BYTES = 25 * 1024 * 1024
const MAX_COMMENT_LENGTH = 300
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX_SUBMISSIONS = 6
const WORD_RATE_MAX_SUBMISSIONS = 4
const DEFAULT_WORD_TIMEOUT_MS = 60_000

const OUTCOMES = new Set(['yes', 'no'])
const REASONS = new Set([
  'result_worked',
  'watermark_remains',
  'quality_reduced',
  'file_wont_open',
  'target_not_met',
  'output_incomplete',
  'too_slow',
  'other',
])

function sendJson(response, status, payload, extraHeaders = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  })
  response.end(JSON.stringify(payload))
}

function createHttpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

async function readJsonBody(request) {
  if (!String(request.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    throw createHttpError(415, 'Content-Type must be application/json')
  }

  const chunks = []
  let total = 0
  for await (const chunk of request) {
    total += chunk.length
    if (total > MAX_BODY_BYTES) throw createHttpError(413, 'Feedback payload is too large')
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw createHttpError(400, 'Invalid JSON')
  }
}

async function readBinaryBody(request, maximumBytes) {
  const declaredLength = Number(request.headers['content-length'] || 0)
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) throw createHttpError(413, 'Word document is larger than 25 MB')
  const chunks = []
  let total = 0
  for await (const chunk of request) {
    total += chunk.length
    if (total > maximumBytes) throw createHttpError(413, 'Word document is larger than 25 MB')
    chunks.push(chunk)
  }
  if (total === 0) throw createHttpError(400, 'Word document is empty')
  return Buffer.concat(chunks)
}

function validateWordBytes(bytes, extension) {
  const isDocx = extension === '.docx' && bytes[0] === 0x50 && bytes[1] === 0x4b
  const isDoc = extension === '.doc' && bytes.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))
  if (!isDocx && !isDoc) throw createHttpError(415, `The uploaded file is not a valid ${extension} document`)
}

function waitForProcess(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    let stderr = ''
    let finished = false
    let timer
    const finish = (callback) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      callback()
    }
    child.stderr?.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-4000) })
    child.once('error', (error) => finish(() => {
      error.status = error.code === 'ENOENT' ? 503 : 502
      reject(error)
    }))
    child.once('close', (code) => finish(() => {
      if (code === 0) resolve()
      else reject(Object.assign(new Error(stderr.trim() || `LibreOffice exited with code ${code}`), { status: 422 }))
    }))
    timer = setTimeout(() => {
      child.kill('SIGKILL')
      finish(() => reject(Object.assign(new Error('Word conversion timed out'), { status: 504 })))
    }, timeoutMs)
  })
}

export async function convertWordDocumentToPdf(bytes, extension, options = {}) {
  const converterBin = options.converterBin || process.env.WORD_CONVERTER_BIN || '/usr/bin/libreoffice'
  const timeoutMs = Number(options.timeoutMs || process.env.WORD_CONVERSION_TIMEOUT_MS || DEFAULT_WORD_TIMEOUT_MS)
  const directory = await mkdtemp(join(options.tempRoot || tmpdir(), 'labofpdf-word-'))
  const profile = join(directory, 'profile')
  const input = join(directory, `document${extension}`)
  const output = join(directory, 'document.pdf')
  try {
    await mkdir(profile)
    await writeFile(input, bytes, { mode: 0o600 })
    const child = spawn(converterBin, [
      `-env:UserInstallation=${pathToFileURL(profile).href}`,
      '--headless', '--nologo', '--nodefault', '--nolockcheck', '--nofirststartwizard',
      '--convert-to', 'pdf:writer_pdf_Export', '--outdir', directory, input,
    ], {
      stdio: ['ignore', 'ignore', 'pipe'],
      env: { ...process.env, HOME: directory, TMPDIR: directory, SAL_USE_VCLPLUGIN: 'svp' },
    })
    await waitForProcess(child, timeoutMs)
    const pdf = await readFile(output)
    if (pdf.length < 8 || !pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      throw Object.assign(new Error('LibreOffice did not create a valid PDF'), { status: 502 })
    }
    return pdf
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return ''
  const withoutControls = Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint < 32 || codePoint === 127 ? ' ' : character
  }).join('')
  return withoutControls.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function validateFeedback(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw createHttpError(400, 'Feedback must be a JSON object')
  }
  const tool = cleanText(payload.tool, 64)
  const outcome = cleanText(payload.outcome, 8)
  const reason = cleanText(payload.reason, 32)
  const comment = cleanText(payload.comment, MAX_COMMENT_LENGTH)
  const releaseCommit = cleanText(payload.releaseCommit, 64)
  const durationBucket = cleanText(payload.durationBucket, 24)
  const sizeBucket = cleanText(payload.sizeBucket, 24)

  if (!/^\/[a-z0-9/_-]*$/.test(tool)) throw createHttpError(400, 'Invalid tool path')
  if (!OUTCOMES.has(outcome)) throw createHttpError(400, 'Invalid outcome')
  if (!REASONS.has(reason)) throw createHttpError(400, 'Invalid reason')
  if (outcome === 'yes' && reason !== 'result_worked') throw createHttpError(400, 'Successful feedback must use result_worked')
  if (outcome === 'no' && reason === 'result_worked') throw createHttpError(400, 'Unsuccessful feedback needs a failure reason')
  if (releaseCommit && !/^(?:[0-9a-f]{40}|local-development)$/.test(releaseCommit)) throw createHttpError(400, 'Invalid release commit')
  if (durationBucket && !/^(?:under-2s|2-10s|10-30s|30-120s|over-120s)$/.test(durationBucket)) throw createHttpError(400, 'Invalid duration bucket')
  if (sizeBucket && !/^(?:under-1mb|1-5mb|5-20mb|20-100mb|over-100mb)$/.test(sizeBucket)) throw createHttpError(400, 'Invalid size bucket')

  return {
    tool,
    outcome,
    reason,
    comment: comment || null,
    releaseCommit: releaseCommit || null,
    durationBucket: durationBucket || null,
    sizeBucket: sizeBucket || null,
  }
}

function readCounters(file) {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    return {
      visitors: Number.isSafeInteger(parsed.visitors) ? parsed.visitors : 108,
      bamboo: Number.isSafeInteger(parsed.bamboo) ? parsed.bamboo : 300,
    }
  } catch {
    return { visitors: 108, bamboo: 300 }
  }
}

function writeCounters(file, counters) {
  mkdirSync(dirname(file), { recursive: true })
  const temporary = `${file}.next`
  writeFileSync(temporary, `${JSON.stringify(counters)}\n`, { mode: 0o640 })
  renameSync(temporary, file)
}

export function createLabOfPdfApi(options = {}) {
  const databasePath = options.databasePath || process.env.FEEDBACK_DB_PATH || DEFAULT_DB_PATH
  const countersPath = options.countersPath || process.env.COUNTERS_PATH || DEFAULT_COUNTERS_PATH
  const allowedOrigins = new Set(options.allowedOrigins || ['https://labofpdf.com'])
  const wordConverter = options.wordConverter || convertWordDocumentToPdf
  const wordConversionEngine = options.wordConversionEngine || 'libreoffice'
  const database = new DatabaseSync(databasePath)
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 3000;
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      tool TEXT NOT NULL,
      outcome TEXT NOT NULL CHECK (outcome IN ('yes', 'no')),
      reason TEXT NOT NULL,
      comment TEXT,
      release_commit TEXT,
      duration_bucket TEXT,
      size_bucket TEXT
    );
    CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback(created_at);
    CREATE INDEX IF NOT EXISTS feedback_tool_outcome_idx ON feedback(tool, outcome);
  `)
  const insertFeedback = database.prepare(`
    INSERT INTO feedback (tool, outcome, reason, comment, release_commit, duration_bucket, size_bucket)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const rateBuckets = new Map()
  const wordRateBuckets = new Map()
  let wordConversionActive = false

  function rateLimitAllows(request) {
    const key = String(request.headers['x-real-ip'] || request.socket.remoteAddress || 'unknown').slice(0, 128)
    const now = Date.now()
    const recent = (rateBuckets.get(key) || []).filter((timestamp) => timestamp > now - RATE_WINDOW_MS)
    if (recent.length >= RATE_MAX_SUBMISSIONS) return false
    recent.push(now)
    rateBuckets.set(key, recent)
    return true
  }

  function wordRateLimitAllows(request) {
    const key = String(request.headers['x-real-ip'] || request.socket.remoteAddress || 'unknown').slice(0, 128)
    const now = Date.now()
    const recent = (wordRateBuckets.get(key) || []).filter((timestamp) => timestamp > now - RATE_WINDOW_MS)
    if (recent.length >= WORD_RATE_MAX_SUBMISSIONS) return false
    recent.push(now)
    wordRateBuckets.set(key, recent)
    return true
  }

  const server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname
    try {
      if (request.method === 'GET' && pathname === '/api/health') {
        sendJson(response, 200, { ok: true, feedbackStorage: 'sqlite', wordConversionEngine })
        return
      }

      if (pathname === '/api/word-to-pdf' && request.method === 'POST') {
        const origin = String(request.headers.origin || '')
        if (!allowedOrigins.has(origin)) throw createHttpError(403, 'Origin is not allowed')
        if (!wordRateLimitAllows(request)) throw createHttpError(429, 'Too many Word conversions; try again in a few minutes')
        if (wordConversionActive) throw createHttpError(503, 'The Word converter is busy; try again shortly')
        wordConversionActive = true
        try {
          const contentType = String(request.headers['content-type'] || '').split(';', 1)[0].toLowerCase()
          if (!['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream'].includes(contentType)) {
            throw createHttpError(415, 'Choose a .doc or .docx Word document')
          }
          let fileName = String(request.headers['x-file-name'] || 'document.docx')
          try { fileName = decodeURIComponent(fileName) } catch { throw createHttpError(400, 'Invalid file name') }
          const extension = extname(fileName).toLowerCase()
          if (!['.doc', '.docx'].includes(extension)) throw createHttpError(415, 'Choose a .doc or .docx Word document')
          const bytes = await readBinaryBody(request, MAX_WORD_BYTES)
          validateWordBytes(bytes, extension)
          const pdf = await wordConverter(bytes, extension)
          const originalBase = basename(fileName, extension).slice(0, 120) || 'converted'
          const asciiBase = originalBase.replace(/[^a-z0-9._-]+/gi, '_').replace(/^[_.]+|[_.]+$/g, '').slice(0, 80) || 'converted'
          response.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Length': pdf.length,
            'Content-Disposition': `attachment; filename="${asciiBase}.pdf"; filename*=UTF-8''${encodeURIComponent(originalBase)}.pdf`,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
          })
          response.end(pdf)
        } finally {
          wordConversionActive = false
        }
        return
      }

      if (pathname === '/api/word-to-pdf') {
        sendJson(response, 405, { error: 'Method not allowed' }, { Allow: 'POST' })
        return
      }

      if (request.method === 'GET' && ['/api/visitors/get', '/api/visitors/hit', '/api/bamboo/get', '/api/bamboo/hit', '/api/bamboo/feed'].includes(pathname)) {
        const counters = readCounters(countersPath)
        if (pathname === '/api/visitors/hit') counters.visitors++
        if (pathname === '/api/bamboo/hit' || pathname === '/api/bamboo/feed') counters.bamboo++
        if (pathname.endsWith('/hit') || pathname.endsWith('/feed')) writeCounters(countersPath, counters)
        sendJson(response, 200, { value: pathname.includes('/visitors/') ? counters.visitors : counters.bamboo })
        return
      }

      if (pathname === '/api/feedback' && request.method === 'POST') {
        const origin = String(request.headers.origin || '')
        if (!allowedOrigins.has(origin)) throw createHttpError(403, 'Origin is not allowed')
        if (!rateLimitAllows(request)) throw createHttpError(429, 'Too many feedback submissions')
        const feedback = validateFeedback(await readJsonBody(request))
        const dryRun = request.headers['x-feedback-dry-run'] === '1'
        if (!dryRun) {
          insertFeedback.run(
            feedback.tool,
            feedback.outcome,
            feedback.reason,
            feedback.comment,
            feedback.releaseCommit,
            feedback.durationBucket,
            feedback.sizeBucket,
          )
        }
        sendJson(response, 201, { ok: true, stored: !dryRun })
        return
      }

      if (pathname === '/api/feedback') {
        sendJson(response, 405, { error: 'Method not allowed' }, { Allow: 'POST' })
        return
      }

      sendJson(response, 404, { error: 'Not found' })
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : 500
      if (status === 500) console.error('API request failed:', error)
      sendJson(response, status, { error: status === 500 ? 'Internal server error' : error.message })
    }
  })

  return {
    server,
    database,
    feedbackCount: () => database.prepare('SELECT COUNT(*) AS count FROM feedback').get().count,
    close: () => new Promise((resolve, reject) => server.close((error) => {
      if (error) reject(error)
      else {
        database.close()
        resolve()
      }
    })),
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const port = Number(process.env.PORT || 3001)
  const api = createLabOfPdfApi()
  api.server.listen(port, '127.0.0.1', () => console.log(`Lab of PDF API listening on 127.0.0.1:${port}`))
  const shutdown = () => api.close().finally(() => process.exit(0))
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
