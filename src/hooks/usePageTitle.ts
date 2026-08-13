import { useEffect } from 'react'

const BASE = 'https://labofpdf.com'

type SeoEntry = {
  title: string
  description: string
  name: string
  tool?: boolean
  article?: boolean
}

const seo: Record<string, SeoEntry> = {
  '/': {
    title: 'Free Private PDF Tools: Compress, Merge & Convert | Lab of PDF',
    description: 'Compress, merge, split and convert PDFs for visa portals, thesis submissions and exact upload limits. Free private tools that run in your browser.',
    name: 'Lab of PDF',
  },
  '/tools': {
    title: 'All Private Browser-Based PDF Tools | Lab of PDF',
    description: 'Browse PDF tools for compression, merging, splitting, page management, Word conversion, images, watermarks, visa packs and upload portals.',
    name: 'All PDF tools',
  },
  '/merge': {
    title: 'Merge PDF Files Without Uploading | Lab of PDF',
    description: 'Combine PDF files, reorder pages and choose exactly what to include. The complete merge runs locally in your browser with no account required.',
    name: 'Merge PDF',
    tool: true,
  },
  '/split': {
    title: 'Split PDF or Extract Selected Pages Privately | Lab of PDF',
    description: 'Split a PDF into separate files or extract selected pages without uploading the document. Preview and process every page in your browser.',
    name: 'Split PDF',
    tool: true,
  },
  '/manage': {
    title: 'Reorder, Rotate, Remove and Extract PDF Pages | Lab of PDF',
    description: 'Visually manage PDF pages in your browser. Reorder, rotate, remove or extract selected pages without sending the file to a server.',
    name: 'Manage PDF pages',
    tool: true,
  },
  '/edit-pdf': {
    title: 'Edit PDF Pages Without Uploading | Lab of PDF',
    description: 'Edit PDF pages locally in your browser: reorder, rotate, remove and extract pages while keeping the original file untouched.',
    name: 'Edit PDF pages',
    tool: true,
  },
  '/to-image': {
    title: 'Convert PDF Pages to PNG or JPEG Privately | Lab of PDF',
    description: 'Turn selected PDF pages into high-quality PNG or JPEG images and download them individually or in a ZIP file. No document upload required.',
    name: 'PDF to images',
    tool: true,
  },
  '/compress': {
    title: 'Compress PDF Without Uploading the File | Lab of PDF',
    description: 'Reduce PDF file size locally with lossless, balanced or maximum-reduction modes. Compare the result and keep the original document unchanged.',
    name: 'Compress PDF',
    tool: true,
  },
  '/compress/visa': {
    title: 'Compress Visa PDF for Embassy Upload Limits | Lab of PDF',
    description: 'Prepare passport, bank statement and supporting PDFs for strict visa portal size limits while processing sensitive documents on your device.',
    name: 'Visa PDF compressor',
    tool: true,
  },
  '/compress/exact': {
    title: 'Compress PDF to a Specific MB Size Target | Lab of PDF',
    description: 'Enter the PDF file-size limit shown by an upload portal, create a smaller copy and verify whether the finished file meets that target.',
    name: 'Target-size PDF compressor',
    tool: true,
  },
  '/thesis-pdf-check': {
    title: 'Check a Thesis PDF Before University Submission | Lab of PDF',
    description: 'Check thesis PDF size, page count, searchable text, page format and orientation before submitting it to a university portal.',
    name: 'Thesis PDF check',
    tool: true,
  },
  '/watermark': {
    title: 'Add a Text Watermark to PDF Pages Privately | Lab of PDF',
    description: 'Add a custom text watermark to every PDF page in your browser. Choose the text and opacity without uploading the source document.',
    name: 'Add PDF watermark',
    tool: true,
  },
  '/unwatermark': {
    title: 'Remove Supported PDF Watermark Annotations | Lab of PDF',
    description: 'Remove supported Stamp and Watermark annotations from an authorized PDF locally. Page content is not uploaded or covered with white boxes.',
    name: 'Remove PDF watermark',
    tool: true,
  },
  '/to-word': {
    title: 'Convert PDF to Word with Browser-Based OCR | Lab of PDF',
    description: 'Convert text PDFs and scanned pages into an editable Word-compatible document. Text extraction and OCR run locally in your browser.',
    name: 'PDF to Word',
    tool: true,
  },
  '/visa-prep': {
    title: 'Organize a Visa Document PDF Pack Privately | Lab of PDF',
    description: 'Label, reorder, combine and size visa application PDFs for government portals. Passport and financial documents stay on your device.',
    name: 'Visa document pack',
    tool: true,
  },
  '/portal-ready-pdf': {
    title: 'Make a PDF Fit an Online Upload Portal Limit | Lab of PDF',
    description: 'Prepare a PDF for government, visa, university, job application or email size limits and verify the finished file before submitting.',
    name: 'Portal-ready PDF',
    tool: true,
  },
  '/privacy': {
    title: 'Privacy Policy and Local PDF Processing | Lab of PDF',
    description: 'Learn how Lab of PDF processes document contents in browser memory, what website requests may contain and how privacy choices work.',
    name: 'Privacy policy',
  },
  '/terms': {
    title: 'Terms of Service | Lab of PDF',
    description: 'Read the terms for using Lab of PDF browser-based document preparation and PDF processing tools.',
    name: 'Terms of service',
  },
  '/security': {
    title: 'How Local PDF Processing Protects Your Files | Lab of PDF',
    description: 'Understand the browser-based security model, local file processing, temporary memory and practical limitations of Lab of PDF.',
    name: 'Security',
  },
  '/guides': {
    title: 'Practical PDF Guides for Study and Submissions | Lab of PDF',
    description: 'Practical PDF guides for university upload limits, searchable scanned notes and organized exam revision packs, linked to free private browser tools.',
    name: 'Practical PDF guides',
  },
  '/editorial-policy': {
    title: 'Editorial Policy: How We Test and Review Content | Lab of PDF',
    description: 'See how Lab of PDF tests workflows, reviews privacy and product claims, handles sources, labels limitations and corrects practical PDF guidance.',
    name: 'Editorial policy',
  },
  '/about/editorial-team': {
    title: 'Lab of PDF Authors and Reviewers | Editorial Team',
    description: 'Learn who writes and reviews Lab of PDF guides, what product and privacy review means, and how to request a content correction.',
    name: 'Authors and reviewers',
  },
  '/guides/compress-pdf-for-university-upload': {
    title: 'How to Reduce PDF Size for a University Upload Portal',
    description: 'Reduce a thesis or assignment PDF below an exact university portal limit, preserve readability and verify the final file before submission.',
    name: 'Reduce PDF size for university upload',
    article: true,
  },
  '/guides/make-scanned-notes-searchable': {
    title: 'How to Make Scanned PDF Notes Searchable for Revision',
    description: 'Use OCR to make scanned lecture notes searchable and editable, check recognition errors and create a faster exam revision workflow.',
    name: 'Make scanned notes searchable',
    article: true,
  },
  '/guides/organize-pdf-study-notes': {
    title: 'How to Organize PDF Study Notes into a Revision Pack',
    description: 'Combine, reorder and reduce PDF lecture notes into a clear exam revision pack without losing sources, diagrams or useful page order.',
    name: 'Organize PDF study notes',
    article: true,
  },
  '/guides/compress-pdf-without-losing-quality': {
    title: 'How to Compress a PDF Without Making It Unreadable',
    description: 'Reduce PDF size while preserving readable text, diagrams and signatures. Choose the mildest useful compression and verify the downloaded copy.',
    name: 'Compress a PDF without making it unreadable',
    article: true,
  },
  '/guides/reduce-scanned-pdf-file-size': {
    title: 'How to Reduce a Scanned PDF File Size',
    description: 'Reduce a large scanned PDF by cleaning pages, choosing suitable image compression and checking small print, handwriting and signatures.',
    name: 'Reduce a scanned PDF file size',
    article: true,
  },
  '/guides/pdf-submission-checklist': {
    title: 'PDF Submission Checklist: 10 Checks Before Upload | Lab of PDF',
    description: 'Print or download a 10-step PDF submission checklist for file size, page order, readability, signatures, filenames and upload confirmation.',
    name: 'PDF submission checklist',
    article: true,
  },
  '/pdf-to-excel': { title: 'PDF to Excel — Coming Soon | Lab of PDF', description: 'PDF table extraction to Excel is currently in development.', name: 'PDF to Excel' },
  '/sign-pdf': { title: 'Sign PDF — Coming Soon | Lab of PDF', description: 'Browser-based PDF signing is currently in development.', name: 'Sign PDF' },
  '/unlock-pdf': { title: 'Unlock PDF — Coming Soon | Lab of PDF', description: 'Browser-based PDF password removal is currently in development.', name: 'Unlock PDF' },
  '/404': { title: 'Page Not Found | Lab of PDF', description: 'The requested Lab of PDF page could not be found.', name: 'Page not found' },
}

const noIndexPaths = new Set(['/404', '/pdf-to-excel', '/sign-pdf', '/unlock-pdf'])

function setMeta(selector: string, attribute: string, value: string) {
  document.querySelector(selector)?.setAttribute(attribute, value)
}

export default function usePageTitle(path: string) {
  useEffect(() => {
    const entry = seo[path] || seo['/404']
    const url = `${BASE}${path === '/' ? '/' : path}`

    document.title = entry.title
    document.documentElement.lang = 'en'
    setMeta('meta[name="description"]', 'content', entry.description)
    setMeta('meta[property="og:title"]', 'content', entry.title)
    setMeta('meta[property="og:description"]', 'content', entry.description)
    setMeta('meta[property="og:url"]', 'content', url)
    setMeta('meta[name="twitter:title"]', 'content', entry.title)
    setMeta('meta[name="twitter:description"]', 'content', entry.description)
    setMeta('meta[name="robots"]', 'content', noIndexPaths.has(path) ? 'noindex, follow' : 'index, follow')
    setMeta('link[rel="canonical"]', 'href', url)
    setMeta('meta[property="og:image"]', 'content', `${BASE}/og-v3.jpg`)
    setMeta('meta[name="twitter:image"]', 'content', `${BASE}/og-v3.jpg`)

    const graph: Record<string, unknown>[] = []
    if (path === '/') {
      graph.push({
        '@type': 'WebSite',
        '@id': `${BASE}/#website`,
        name: 'Lab of PDF',
        url: `${BASE}/`,
        description: entry.description,
        publisher: { '@id': `${BASE}/#organization` },
      })
      graph.push({
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Can I compress a PDF to a specific size, such as 5 MB?',
            acceptedAnswer: { '@type': 'Answer', text: 'Yes. Enter the exact upload limit and Lab of PDF will create a smaller copy and verify whether it meets the target.' },
          },
          {
            '@type': 'Question',
            name: 'Can I check a thesis PDF before university submission?',
            acceptedAnswer: { '@type': 'Answer', text: 'Yes. The thesis workflow checks file size, page count, searchable text, page format, and orientation before upload.' },
          },
          {
            '@type': 'Question',
            name: 'Are visa and passport PDFs uploaded to a server?',
            acceptedAnswer: { '@type': 'Answer', text: 'Supported workflows process document contents locally in the browser, so files stay on the user’s device.' },
          },
        ],
      })
      graph.push({
        '@type': 'Organization',
        '@id': `${BASE}/#organization`,
        name: 'Lab of PDF',
        url: `${BASE}/`,
        logo: `${BASE}/logo-google.png`,
      })
    }
    if (entry.tool) {
      graph.push({
        '@type': 'SoftwareApplication',
        name: entry.name,
        url,
        description: entry.description,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any operating system with a modern web browser',
        browserRequirements: 'JavaScript enabled',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      })
    }
    if (entry.article) {
      const articleDate = path === '/guides/pdf-submission-checklist' ? '2026-08-13' : '2026-08-08'
      graph.push({
        '@type': 'Article',
        headline: entry.name,
        url,
        description: entry.description,
        datePublished: articleDate,
        dateModified: articleDate,
        author: { '@type': 'Organization', name: 'Lab of PDF editorial team', url: `${BASE}/about/editorial-team` },
        reviewedBy: { '@type': 'Organization', name: 'Lab of PDF product and privacy review', url: `${BASE}/editorial-policy` },
        publisher: { '@type': 'Organization', name: 'Lab of PDF', url: `${BASE}/`, logo: { '@type': 'ImageObject', url: `${BASE}/logo-google.png` } },
        image: `${BASE}/og-v3.jpg`,
        mainEntityOfPage: url,
      })
    }
    if (path !== '/' && !noIndexPaths.has(path)) {
      const items = [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
      ]
      if (entry.tool) {
        items.push({ '@type': 'ListItem', position: 2, name: 'PDF tools', item: `${BASE}/tools` })
        items.push({ '@type': 'ListItem', position: 3, name: entry.name, item: url })
      } else {
        items.push({ '@type': 'ListItem', position: 2, name: entry.name, item: url })
      }
      graph.push({ '@type': 'BreadcrumbList', itemListElement: items })
    }

    document.getElementById('page-structured-data')?.remove()
    if (graph.length > 0) {
      const script = document.createElement('script')
      script.id = 'page-structured-data'
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
      document.head.appendChild(script)
    }

    return () => document.getElementById('page-structured-data')?.remove()
  }, [path])
}
