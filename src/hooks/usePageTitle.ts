import { useEffect } from 'react'

const BASE = 'https://labofpdf.com'

const titles: Record<string, string> = {
  '/': 'Free Online PDF Tools — No Upload, No Sign-Up, Unlimited Use | Lab of PDF',
  '/merge': 'Merge PDF Files Online Free — No Upload, Browser-Based PDF Merger | Lab of PDF',
  '/split': 'Split PDF Online Free — Extract Pages from PDF Without Uploading | Lab of PDF',
  '/compress': 'Compress PDF Online Free — Reduce PDF Size Without Uploading, No Limits | Lab of PDF',
  '/to-word': 'Convert PDF to Word Online Free — No Upload, Browser-Based OCR | Lab of PDF',
  '/watermark': 'Add Watermark to PDF Online Free — No Upload, No Sign-Up | Lab of PDF',
  '/unwatermark': 'Remove Watermark from PDF Online Free — Browser-Based, No Upload | Lab of PDF',
  '/manage': 'Delete, Rotate & Extract PDF Pages Online Free — No Upload Required | Lab of PDF',
  '/to-image': 'Convert PDF to Image Online Free — PNG/JPEG, No Upload, Unlimited Pages | Lab of PDF',
  '/privacy': 'Privacy Policy — No Upload, No Tracking PDF Tools | Lab of PDF',
  '/terms': 'Terms of Service | Lab of PDF',
  '/security': 'Security — Browser-Based PDF Processing, Files Never Leave Your Device | Lab of PDF',
}

const descriptions: Record<string, string> = {
  '/': 'Free online PDF tools that process entirely in your browser. Merge, split, compress, watermark, and convert PDFs with no upload, no sign-up, no file size limits, and no privacy risk. Your files never leave your device — 100% private and secure.',
  '/merge': 'Merge multiple PDF files into one document online for free — no upload required. Combine PDFs directly in your browser with zero privacy risk. Unlimited pages, no file size limit, no sign-up. Preview, reorder, and select pages before merging.',
  '/split': 'Split PDF or extract specific pages from a PDF online for free without uploading. Browser-based PDF splitter with complete privacy — your files never leave your device. Unlimited pages, no file size limit, no registration needed.',
  '/compress': 'Compress PDF files online free without uploading. Reduce PDF size losslessly in your browser — text stays selectable and searchable. No file size limits, no sign-up, unlimited compressions. Your files remain 100% private.',
  '/to-word': 'Convert PDF to Word document online free with no upload. Browser-based converter with automatic OCR for scanned pages. No limits on pages or file size, no sign-up required, complete privacy — your files never leave your device.',
  '/watermark': 'Add a text watermark to every page of your PDF online free — no upload needed. Customize text, opacity, and angle. Browser-based processing ensures your files stay private. Unlimited pages, no file size limit, no sign-up.',
  '/unwatermark': 'Remove watermarks from PDF files online free without uploading. Browser-based watermark remover strips overlay watermarks while keeping your files private. No sign-up, no limits, no data leaves your computer.',
  '/manage': 'Delete, rotate, and extract PDF pages online free with no upload. Visual preview makes page management easy. Browser-based processing means zero privacy risk — your files never leave your device. No limits, no sign-up.',
  '/to-image': 'Convert PDF pages to PNG or JPEG images online free without uploading. Download individually or as ZIP. Browser-based converter with no page limits, no file size limits, no sign-up. Complete privacy — files never leave your device.',
  '/privacy': 'Lab of PDF processes all files locally in your browser. No files are uploaded, no cookies track you, no personal data collected. Your documents never leave your device.',
  '/terms': 'Terms of service for Lab of PDF. Free online PDF tools with browser-based processing.',
  '/security': 'Lab of PDF processes everything in your browser. Files never leave your device. No uploads, no servers, no data retention. Open-source architecture auditable by anyone.',
}

const ogImageLabels: Record<string, string> = {
  '/': 'Free Online PDF Tools — No Upload',
  '/merge': 'Merge PDF — No Upload',
  '/split': 'Split PDF — No Upload',
  '/compress': 'Compress PDF — No Upload',
  '/to-word': 'PDF to Word — No Upload',
  '/watermark': 'Add Watermark — No Upload',
  '/unwatermark': 'Remove Watermark — No Upload',
  '/manage': 'Manage Pages — No Upload',
  '/to-image': 'PDF to Image — No Upload',
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
