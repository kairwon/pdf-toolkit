import { useEffect } from 'react'

const BASE = 'https://labofpdf.com'

const titles: Record<string, string> = {
  '/': 'Free Online PDF Tools — Merge, Split, Compress & More | Lab of PDF',
  '/merge': 'Merge PDF — Combine PDF Files Online Free | Lab of PDF',
  '/split': 'Split PDF — Extract Pages from PDF Online Free | Lab of PDF',
  '/compress': 'Compress PDF — Reduce PDF Size Online Free | Lab of PDF',
  '/to-word': 'PDF to Word — Convert PDF to Word Online Free | Lab of PDF',
  '/watermark': 'Add Watermark to PDF — Online Free | Lab of PDF',
  '/unwatermark': 'Remove Watermark from PDF — Online Free | Lab of PDF',
  '/manage': 'Manage PDF Pages — Delete, Rotate, Extract Online | Lab of PDF',
  '/to-image': 'PDF to Image — Convert PDF to PNG/JPEG Online | Lab of PDF',
  '/privacy': 'Privacy Policy | Lab of PDF',
  '/terms': 'Terms of Service | Lab of PDF',
  '/security': 'Security | Lab of PDF',
}

const descriptions: Record<string, string> = {
  '/': 'Free online PDF tools to merge, split, compress, watermark, and convert PDFs. All processing happens in your browser — no uploads, no limits, no sign-up.',
  '/merge': 'Combine multiple PDF files into one document online for free. Preview pages, reorder, and select exactly which pages to include.',
  '/split': 'Extract specific pages from a PDF or split it into separate files. Free online PDF splitter — no upload required.',
  '/compress': 'Reduce PDF file size losslessly. Text stays selectable and searchable. Free online PDF compression tool.',
  '/to-word': 'Convert PDF to Word document. Automatically detects text vs scanned pages and uses OCR when needed. Free and private.',
  '/watermark': 'Add a text watermark to every page of your PDF. Customize text, opacity, and angle. Free online PDF watermark tool.',
  '/unwatermark': 'Strip overlay watermarks from PDF files. Covers common watermark regions. Free online PDF watermark remover.',
  '/manage': 'Delete, rotate, or extract pages from your PDF with a visual preview. Free online PDF page manager.',
  '/to-image': 'Convert PDF pages to PNG or JPEG images. Download individually or as ZIP. Free online PDF to image converter.',
  '/privacy': 'Privacy policy for Lab of PDF. Your files never leave your browser.',
  '/terms': 'Terms of service for Lab of PDF.',
  '/security': 'Security information for Lab of PDF. All processing happens locally in your browser.',
}

const ogImageLabels: Record<string, string> = {
  '/': 'Free Online PDF Tools',
  '/merge': 'Merge PDF',
  '/split': 'Split PDF',
  '/compress': 'Compress PDF',
  '/to-word': 'PDF to Word',
  '/watermark': 'Add Watermark',
  '/unwatermark': 'Remove Watermark',
  '/manage': 'Manage Pages',
  '/to-image': 'PDF to Image',
}

function makeOgImageDataUrl(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f0faf4"/>
        <stop offset="100%" stop-color="#e6f0ea"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)" rx="0"/>
    <rect x="40" y="40" width="1120" height="550" rx="24" fill="#fff" opacity="0.7"/>
    <text x="80" y="240" font-family="system-ui,-apple-system,sans-serif" font-size="52" font-weight="700" fill="#111">${label}</text>
    <text x="80" y="310" font-family="system-ui,-apple-system,sans-serif" font-size="28" fill="#666">
      All processing happens locally in your browser
    </text>
    <text x="80" y="540" font-family="system-ui,-apple-system,sans-serif" font-size="22" font-weight="600" fill="#2fa36b">Lab of PDF</text>
    <circle cx="1060" cy="340" r="160" fill="#e8f5ec"/>
    <text x="1060" y="370" font-family="system-ui,-apple-system,sans-serif" font-size="120" text-anchor="middle">🐼</text>
  </svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

export default function usePageTitle(path: string) {
  useEffect(() => {
    document.title = titles[path] || 'Lab of PDF — Free Online PDF Tools'
    const url = BASE + path

    // Meta description
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc && descriptions[path]) {
      metaDesc.setAttribute('content', descriptions[path])
    }

    // OG description
    const ogDesc = document.querySelector('meta[property="og:description"]')
    if (ogDesc && descriptions[path]) {
      ogDesc.setAttribute('content', descriptions[path])
    }

    // OG title
    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle && titles[path]) {
      ogTitle.setAttribute('content', titles[path])
    }

    // Canonical link
    const canonical = document.querySelector('link[rel="canonical"]')
    if (canonical) {
      canonical.setAttribute('href', url)
    }

    // OG url
    const ogUrl = document.querySelector('meta[property="og:url"]')
    if (ogUrl) {
      ogUrl.setAttribute('content', url)
    }

    // OG image — per page
    const label = ogImageLabels[path] || 'Free Online PDF Tools'
    const ogImageDataUrl = makeOgImageDataUrl(label)
    const ogImage = document.querySelector('meta[property="og:image"]')
    if (ogImage) {
      ogImage.setAttribute('content', ogImageDataUrl)
    }
    const twitterImage = document.querySelector('meta[name="twitter:image"]')
    if (twitterImage) {
      twitterImage.setAttribute('content', ogImageDataUrl)
    }
  }, [path])
}
