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
  '/guides': ['Practical PDF Guides for Study and Submissions | Lab of PDF', 'Practical PDF guides for university upload limits, searchable scanned notes and organized exam revision packs, linked to free private browser tools.', 'Practical PDF guides'],
  '/editorial-policy': ['Editorial Policy: How We Test and Review Content | Lab of PDF', 'See how Lab of PDF tests workflows, reviews privacy and product claims, handles sources, labels limitations and corrects practical PDF guidance.', 'Editorial policy'],
  '/about/editorial-team': ['Lab of PDF Authors and Reviewers | Editorial Team', 'Learn who writes and reviews Lab of PDF guides, what product and privacy review means, and how to request a content correction.', 'Authors and reviewers'],
  '/guides/compress-pdf-for-university-upload': ['How to Reduce PDF Size for a University Upload Portal', 'Reduce a thesis or assignment PDF below an exact university portal limit, preserve readability and verify the final file before submission.', 'Reduce PDF size for university upload'],
  '/guides/make-scanned-notes-searchable': ['How to Make Scanned PDF Notes Searchable for Revision', 'Use OCR to make scanned lecture notes searchable and editable, check recognition errors and create a faster exam revision workflow.', 'Make scanned notes searchable'],
  '/guides/organize-pdf-study-notes': ['How to Organize PDF Study Notes into a Revision Pack', 'Combine, reorder and reduce PDF lecture notes into a clear exam revision pack without losing sources, diagrams or useful page order.', 'Organize PDF study notes'],
  '/guides/compress-pdf-without-losing-quality': ['How to Compress a PDF Without Making It Unreadable', 'Reduce PDF size while preserving readable text, diagrams and signatures. Choose the mildest useful compression and verify the downloaded copy.', 'Compress a PDF without making it unreadable'],
  '/guides/reduce-scanned-pdf-file-size': ['How to Reduce a Scanned PDF File Size', 'Reduce a large scanned PDF by cleaning pages, choosing suitable image compression and checking small print, handwriting and signatures.', 'Reduce a scanned PDF file size'],
}

const toolPaths = new Set(Object.keys(pages).filter((path) => !['/tools', '/privacy', '/terms', '/security'].includes(path)))
for (const path of ['/guides', '/editorial-policy', '/about/editorial-team', '/guides/compress-pdf-for-university-upload', '/guides/make-scanned-notes-searchable', '/guides/organize-pdf-study-notes', '/guides/compress-pdf-without-losing-quality', '/guides/reduce-scanned-pdf-file-size']) toolPaths.delete(path)
const articlePaths = new Set(['/guides/compress-pdf-for-university-upload', '/guides/make-scanned-notes-searchable', '/guides/organize-pdf-study-notes', '/guides/compress-pdf-without-losing-quality', '/guides/reduce-scanned-pdf-file-size'])
const staticBodies = {
  '/guides': `<main class="guides-page"><header class="guides-hero"><span>PRACTICAL PDF GUIDES</span><h1>Finish the document task, not just the file conversion</h1><p>Step-by-step guidance for university uploads, scanned notes, readable compression and exam revision packs. Every guide connects to a private browser tool.</p></header><section class="guide-grid"><article><h2>Reduce a PDF for a university submission portal</h2><p>Meet an exact MB limit without sacrificing readable text or submitting the wrong file.</p><a href="/guides/compress-pdf-for-university-upload">Read the university upload guide</a></article><article><h2>Make scanned lecture notes searchable</h2><p>Use OCR carefully, verify recognition errors and create notes you can search.</p><a href="/guides/make-scanned-notes-searchable">Read the searchable notes guide</a></article><article><h2>Organize PDF study notes for exams</h2><p>Remove duplicates, arrange topics and create a useful revision pack.</p><a href="/guides/organize-pdf-study-notes">Read the revision pack guide</a></article><article><h2>Compress a PDF without making it unreadable</h2><p>Choose the mildest useful reduction and inspect text, diagrams and signatures.</p><a href="/guides/compress-pdf-without-losing-quality">Read the readable compression guide</a></article><article><h2>Reduce a scanned PDF file size</h2><p>Clean large scans and protect small print, handwriting, stamps and signatures.</p><a href="/guides/reduce-scanned-pdf-file-size">Read the scanned PDF guide</a></article></section></main>`,
  '/editorial-policy': `<main class="content-article"><article class="content-body"><h1>How Lab of PDF reviews practical content</h1><p>We define the real document outcome, test the current workflow with non-sensitive samples, verify the result, review privacy claims and state important limits. Official university and government instructions always take priority. Content is written by the Lab of PDF editorial team without invented credentials. Corrections can be sent to labofpdf@gmail.com without attaching confidential documents.</p><h2>Our review sequence</h2><ol><li>Define the user’s real constraint.</li><li>Test the current production workflow.</li><li>Verify size, format, order and readability.</li><li>Review local-processing and privacy claims.</li><li>Document failure cases and changing requirements.</li></ol></article></main>`,
  '/about/editorial-team': `<main class="content-article"><article class="content-body"><h1>Who writes and reviews Lab of PDF content</h1><p>The Lab of PDF editorial team maintains the product documentation and practical guides. We use a transparent team identity instead of inventing a named expert or unsupported credentials. Product review checks that instructions match the current interface. Privacy review checks local-processing claims against the application architecture.</p><p><a href="/editorial-policy">Read the complete editorial method</a>.</p></article></main>`,
  '/guides/compress-pdf-for-university-upload': `<main class="content-article"><article class="content-body"><h1>How to reduce a PDF for a university submission portal</h1><p>Start by recording the portal’s exact size limit, accepted format and whether it expects one PDF or several files. Keep the original, remove accidental pages, then begin with balanced compression. Aim slightly below the limit.</p><h2>Verify the downloaded PDF</h2><ul><li>Check its filename and file size.</li><li>Open the downloaded copy.</li><li>Inspect the first, middle and last pages.</li><li>Zoom into tables, equations and signatures.</li><li>Confirm page count, orientation and searchable text.</li></ul><p>If the file is still too large, remove unnecessary pages or improve the source scan instead of repeatedly compressing it. Follow the university’s official requirements as the final authority.</p><p><a href="/compress/exact">Compress a PDF to an exact size</a></p></article></main>`,
  '/guides/make-scanned-notes-searchable': `<main class="content-article"><article class="content-body"><h1>Make scanned lecture notes searchable for faster revision</h1><p>First try selecting or searching the PDF text. If each page behaves like a photograph, OCR is needed. Rotate pages, remove blanks and test a short sample before processing a large scan.</p><h2>Check OCR before studying from it</h2><p>Compare dense text, headings, tables and formulas with the original. Names, dates, equations and low-contrast words need manual checking. Apply consistent headings, retain original page references and use the searchable copy for navigation—not as a replacement for the source.</p><p><a href="/to-word">Convert scanned PDF notes with OCR</a></p></article></main>`,
  '/guides/organize-pdf-study-notes': `<main class="content-article"><article class="content-body"><h1>Organize PDF study notes into one useful revision pack</h1><p>Choose a predictable order such as syllabus sequence or exam weighting. Keep full readings in an archive and include only high-value summaries, diagrams, formulas and examples in the master pack.</p><h2>Clean and combine</h2><p>Remove duplicates and blank pages, rotate pages, extract useful sections and preserve source references. Merge one topic at a time, verify each transition and compress only after the order is correct. If the final file is slow to open, create one PDF per major unit.</p><p><a href="/merge">Merge and reorder PDF study notes</a></p></article></main>`,
  '/guides/compress-pdf-without-losing-quality': `<main class="content-article"><article class="content-body"><h1>How to compress a PDF without making it unreadable</h1><p>Keep the original and define what must remain readable. Check whether images, scans, duplicate pages or complex graphics are making the file large. Begin with the mildest useful compression and use stronger image reduction only when a real email or portal limit still is not met.</p><h2>Verify the downloaded copy</h2><p>Open the result, check the smallest text, footnotes, equations, diagrams, signatures and QR codes, then confirm page count, orientation, searchable text and finished size. If quality fails, return to the original instead of repeatedly compressing the reduced copy.</p><p><a href="/compress">Compress a PDF privately</a></p></article></main>`,
  '/guides/reduce-scanned-pdf-file-size': `<main class="content-article"><article class="content-body"><h1>How to reduce a scanned PDF file size</h1><p>Scanned pages are images, so colour, resolution, backgrounds and blank margins can make a short file large. Keep the original, remove accidental pages, rotate the scan and use grayscale only when colour carries no required information.</p><h2>Protect important details</h2><p>Start with balanced compression. Open the downloaded copy and inspect small print, handwriting, stamps, signatures and reference numbers. Confirm page order and size. If it remains too large, rescan poorly framed pages or split the document only when the recipient accepts multiple files.</p><p><a href="/compress">Compress a scanned PDF</a></p></article></main>`,
}
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
  } else if (path === '/guides') {
    graph.unshift({ '@type': 'CollectionPage', name, url, description, about: 'Practical PDF workflows for study and document submissions' })
  } else if (articlePaths.has(path)) {
    graph.unshift({
      '@type': 'Article',
      headline: name,
      url,
      description,
      datePublished: '2026-08-08',
      dateModified: '2026-08-08',
      author: { '@type': 'Organization', name: 'Lab of PDF editorial team', url: `${BASE}/about/editorial-team` },
      reviewedBy: { '@type': 'Organization', name: 'Lab of PDF product and privacy review', url: `${BASE}/editorial-policy` },
      publisher: { '@type': 'Organization', name: 'Lab of PDF', url: `${BASE}/`, logo: { '@type': 'ImageObject', url: `${BASE}/logo-google.png` } },
      image: `${BASE}/og-v3.jpg`,
      mainEntityOfPage: url,
    })
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}

function renderRoute(source, path, [title, description, name]) {
  const url = `${BASE}${path}`
  const structuredData = `<script type="application/ld+json">${JSON.stringify(graphFor(path, title, description, name))}</script>`
  let html = source
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/(<link\s+rel=["']canonical["'][^>]*href=["'])[^"']*(["'][^>]*>)/i, `$1${url}$2`)
  html = html.replace(/(<meta\s+name=["']description["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(description)}$2`)
  html = html.replace(/(<meta\s+property=["']og:title["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(title)}$2`)
  html = html.replace(/(<meta\s+property=["']og:description["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(description)}$2`)
  html = html.replace(/(<meta\s+property=["']og:url["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${url}$2`)
  html = html.replace(/(<meta\s+name=["']twitter:title["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(title)}$2`)
  html = html.replace(/(<meta\s+name=["']twitter:description["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(description)}$2`)
  if (/<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/i.test(html)) {
    html = html.replace(/<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/i, structuredData)
  } else {
    html = html.replace('</head>', `    ${structuredData}\n  </head>`)
  }
  if (articlePaths.has(path)) html = html.replace('property="og:type" content="website"', 'property="og:type" content="article"')
  if (staticBodies[path]) html = html.replace('<div id="root"></div>', `<div id="root">${staticBodies[path]}</div>`)
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
