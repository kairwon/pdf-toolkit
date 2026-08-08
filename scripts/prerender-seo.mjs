import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const BASE = 'https://labofpdf.com'
const DIST = new URL('../dist/', import.meta.url)

const pages = {
  '/tools': ['All Private Browser-Based PDF Tools | Lab of PDF', 'Browse private PDF tools for compression, merging, splitting, page management, Word conversion, images, watermarks, visa packs and upload portals.', 'All PDF tools'],
  '/merge': ['Merge PDF Files Without Uploading | Lab of PDF', 'Combine PDF files, reorder pages and choose exactly what to include. The complete merge runs locally in your browser with no account required.', 'Merge PDF'],
  '/split': ['Split PDF or Extract Selected Pages Privately | Lab of PDF', 'Split a PDF into separate files or extract selected pages without uploading the document. Preview and process every page in your browser.', 'Split PDF'],
  '/manage': ['Reorder, Rotate, Remove and Extract PDF Pages | Lab of PDF', 'Visually manage PDF pages in your browser. Reorder, rotate, remove or extract selected pages without sending the file to a server.', 'Manage PDF pages'],
  '/edit-pdf': ['Edit PDF Pages Without Uploading | Lab of PDF', 'Edit PDF pages locally in your browser: reorder, rotate, remove and extract pages while keeping the original file untouched.', 'Edit PDF pages'],
  '/to-image': ['Convert PDF Pages to PNG or JPEG Privately | Lab of PDF', 'Turn selected PDF pages into high-quality PNG or JPEG images and download them individually or in a ZIP file. No document upload required.', 'PDF to images'],
  '/compress': ['Compress PDF Without Uploading the File | Lab of PDF', 'Reduce PDF file size locally with lossless, balanced or maximum-reduction modes. Compare the result and keep the original document unchanged.', 'Compress PDF'],
  '/compress/visa': ['Compress Visa PDF for Embassy Upload Limits | Lab of PDF', 'Prepare passport, bank statement and supporting PDFs for strict visa portal size limits while processing sensitive documents on your device.', 'Visa PDF compressor'],
  '/compress/exact': ['Compress PDF to a Specific MB Size Target | Lab of PDF', 'Enter the PDF file-size limit shown by an upload portal, create a smaller copy and verify whether the finished file meets that target.', 'Target-size PDF compressor'],
  '/thesis-pdf-check': ['Check a Thesis PDF Before University Submission | Lab of PDF', 'Check thesis PDF size, page count, searchable text, page format and orientation before submitting it to a university portal.', 'Thesis PDF check'],
  '/watermark': ['Add a Text Watermark to PDF Pages Privately | Lab of PDF', 'Add a custom text watermark to every PDF page in your browser without uploading the source document.', 'Add PDF watermark'],
  '/unwatermark': ['Remove Supported PDF Watermark Annotations | Lab of PDF', 'Remove supported Stamp and Watermark annotations from an authorized PDF locally. Page content is not uploaded.', 'Remove PDF watermark'],
  '/to-word': ['Convert PDF to Word with Browser-Based OCR | Lab of PDF', 'Convert text PDFs and scanned pages into an editable Word-compatible document. Text extraction and OCR run locally in your browser.', 'PDF to Word'],
  '/visa-prep': ['Organize a Visa Document PDF Pack Privately | Lab of PDF', 'Label, reorder, combine and size visa application PDFs for government portals. Passport and financial documents stay on your device.', 'Visa document pack'],
  '/portal-ready-pdf': ['Make a PDF Fit an Online Upload Portal Limit | Lab of PDF', 'Prepare a PDF for government, visa, university, job application or email size limits and verify the finished file before submitting.', 'Portal-ready PDF'],
  '/privacy': ['Privacy Policy and Local PDF Processing | Lab of PDF', 'Learn how Lab of PDF processes document contents in browser memory, what website requests may contain and how privacy choices work.', 'Privacy policy'],
  '/terms': ['Terms of Service | Lab of PDF', 'Read the terms for using Lab of PDF browser-based document preparation and PDF processing tools.', 'Terms of service'],
  '/security': ['How Local PDF Processing Protects Your Files | Lab of PDF', 'Understand the browser-based security model, local file processing, temporary memory and practical limitations of Lab of PDF.', 'Security'],
}

const toolPaths = new Set(Object.keys(pages).filter((path) => !['/tools', '/privacy', '/terms', '/security'].includes(path)))
const noIndexPages = {
  '/pdf-to-excel': ['PDF to Excel — Coming Soon | Lab of PDF', 'PDF table extraction to Excel is currently in development.', 'PDF to Excel'],
  '/sign-pdf': ['Sign PDF — Coming Soon | Lab of PDF', 'Browser-based PDF signing is currently in development.', 'Sign PDF'],
  '/unlock-pdf': ['Unlock PDF — Coming Soon | Lab of PDF', 'Browser-based PDF password removal is currently in development.', 'Unlock PDF'],
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function graphFor(path, title, description, name) {
  const url = `${BASE}${path}`
  const graph = [{
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
      ...(toolPaths.has(path) ? [{ '@type': 'ListItem', position: 2, name: 'PDF tools', item: `${BASE}/tools` }] : []),
      { '@type': 'ListItem', position: toolPaths.has(path) ? 3 : 2, name, item: url },
    ],
  }]
  if (toolPaths.has(path)) {
    graph.unshift({
      '@type': 'SoftwareApplication',
      name,
      url,
      description,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any operating system with a modern web browser',
      browserRequirements: 'JavaScript enabled',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      provider: { '@type': 'Organization', name: 'Lab of PDF', url: `${BASE}/` },
    })
  } else if (path === '/tools') {
    graph.unshift({ '@type': 'CollectionPage', name, url, description })
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}

function renderRoute(source, path, [title, description, name]) {
  const url = `${BASE}${path}`
  let html = source
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/(<link\s+rel=["']canonical["'][^>]*href=["'])[^"']*(["'][^>]*>)/i, `$1${url}$2`)
  html = html.replace(/(<meta\s+name=["']description["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(description)}$2`)
  html = html.replace(/(<meta\s+property=["']og:title["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(title)}$2`)
  html = html.replace(/(<meta\s+property=["']og:description["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(description)}$2`)
  html = html.replace(/(<meta\s+property=["']og:url["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${url}$2`)
  html = html.replace(/(<meta\s+name=["']twitter:title["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(title)}$2`)
  html = html.replace(/(<meta\s+name=["']twitter:description["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(description)}$2`)
  html = html.replace(/<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/i, `<script type="application/ld+json">${JSON.stringify(graphFor(path, title, description, name))}</script>`)
  return html
}

const source = await readFile(new URL('index.html', DIST), 'utf8')
for (const [path, entry] of Object.entries(pages)) {
  const relative = `${path.slice(1)}.html`
  const destination = new URL(relative, DIST)
  await mkdir(dirname(destination.pathname), { recursive: true })
  await writeFile(destination, renderRoute(source, path, entry))
}
for (const [path, entry] of Object.entries(noIndexPages)) {
  const relative = `${path.slice(1)}.html`
  const destination = new URL(relative, DIST)
  const html = renderRoute(source, path, entry)
    .replace(/(<meta\s+name=["']robots["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, '$1noindex, follow$2')
  await writeFile(destination, html)
}

const notFound = source
  .replace(/<title>[\s\S]*?<\/title>/i, '<title>Page Not Found | Lab of PDF</title>')
  .replace(/(<meta\s+name=["']robots["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, '$1noindex, follow$2')
await writeFile(join(DIST.pathname, '404.html'), notFound)

const sitemapUrl = new URL('sitemap.xml', DIST)
const sitemap = await readFile(sitemapUrl, 'utf8')
await writeFile(sitemapUrl, sitemap.replace(/<loc>([^<]+)<\/loc>(?!<lastmod>)/g, '<loc>$1</loc><lastmod>2026-08-08</lastmod>'))

console.log(`Prerendered ${Object.keys(pages).length} indexable routes, ${Object.keys(noIndexPages).length} noindex routes, and a noindex 404 page.`)
