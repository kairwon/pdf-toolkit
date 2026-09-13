import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const base = 'https://labofpdf.com'
const dist = new URL('../dist/', import.meta.url)
const sitemap = await readFile(new URL('sitemap.xml', dist), 'utf8')
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
const titles = new Map()
const descriptions = new Map()
const errors = []

const remember = (map, value, path, label) => {
  if (!value) return
  if (map.has(value)) errors.push(`${path}: duplicate ${label} also used by ${map.get(value)}`)
  else map.set(value, path)
}

for (const url of urls) {
  const parsed = new URL(url)
  const path = parsed.pathname
  if (parsed.origin !== base) { errors.push(`${url}: unexpected sitemap origin`); continue }
  const relative = path === '/' ? 'index.html' : `${path.slice(1)}.html`
  const file = join(dist.pathname, relative)
  try { await access(file) } catch { errors.push(`${path}: missing ${relative}`); continue }
  const html = await readFile(file, 'utf8')
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim()
  const description = html.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']+)/i)?.[1]?.trim()
  const canonical = html.match(/<link\s+rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1]
  const robots = html.match(/<meta\s+name=["']robots["'][^>]*content=["']([^"']+)/i)?.[1] || ''
  if (!title || title.length < 20 || title.length > 70) errors.push(`${path}: title must be 20–70 characters`)
  if (!description || description.length < 70 || description.length > 170) errors.push(`${path}: description must be 70–170 characters`)
  if (canonical !== url) errors.push(`${path}: canonical is ${canonical || 'missing'}, expected ${url}`)
  if (/noindex/i.test(robots)) errors.push(`${path}: sitemap page is marked noindex`)
  if (!/<h1[\s>]/i.test(html)) errors.push(`${path}: crawlable H1 is missing`)
  remember(titles, title, path, 'title')
  remember(descriptions, description, path, 'description')
  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]) } catch { errors.push(`${path}: invalid JSON-LD`) }
  }
}

if (new Set(urls).size !== urls.length) errors.push('sitemap contains duplicate URLs')
if (errors.length) {
  console.error(`SEO validation failed:\n- ${errors.join('\n- ')}`)
  process.exit(1)
}
console.log(`SEO validation passed for ${urls.length} canonical indexable pages.`)
