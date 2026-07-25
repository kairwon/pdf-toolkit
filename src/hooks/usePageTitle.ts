import { useEffect } from 'react'

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

export default function usePageTitle(path: string) {
  useEffect(() => {
    document.title = titles[path] || 'Lab of PDF — Free Online PDF Tools'
    const meta = document.querySelector('meta[name="description"]')
    if (meta && descriptions[path]) {
      meta.setAttribute('content', descriptions[path])
    }
    const og = document.querySelector('meta[property="og:description"]')
    if (og && descriptions[path]) {
      og.setAttribute('content', descriptions[path])
    }
  }, [path])
}
