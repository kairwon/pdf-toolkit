import { useLocation } from 'react-router-dom'

const BASE = 'https://labofpdf.com'

const breadcrumbFor = (path: string): object | null => {
  if (path === '/' || path === '/404') return null
  const segments = path.split('/').filter(Boolean)
  const items = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: BASE + '/' },
  ]
  // Build breadcrumb from path segments
  let running = ''
  for (let i = 0; i < segments.length; i++) {
    running += '/' + segments[i]
    const names: Record<string, string> = {
      'merge': 'Merge PDF',
      'split': 'Split PDF',
      'compress': 'Compress PDF',
      'visa': 'Visa Compress',
      'exact': 'Exact Size Compress',
      'thesis-pdf-check': 'Thesis PDF Check',
      'to-word': 'PDF to Word',
      'word-to-pdf': 'Word to PDF',
      'to-image': 'PDF to Image',
      'watermark': 'Add Watermark',
      'unwatermark': 'Remove Watermark',
      'manage': 'Manage Pages',
      'edit': 'Visual PDF Editor',
      'redact-pdf': 'Securely Redact PDF',
      'crop-pdf': 'Crop and Resize PDF',
      'ocr-pdf': 'Make PDF Searchable',
      'scan-cleanup': 'Clean Scanned PDF',
      'workflows': 'Reusable PDF Workflows',
      'compare-pdf': 'Compare PDFs',
      'pdf-forms': 'PDF Forms',
      'document-info': 'PDF Document Information',
      'visa-prep': 'Visa Document Pack',
      'portal-ready-pdf': 'Portal-Ready PDF',
      'privacy': 'Privacy Policy',
      'terms': 'Terms of Service',
      'security': 'Security',
      'edit-pdf': 'Visual PDF Editor',
      'pdf-to-excel': 'PDF to Excel',
      'sign-pdf': 'Sign PDF',
      'unlock-pdf': 'Unlock PDF',
    }
    items.push({
      '@type': 'ListItem',
      position: i + 2,
      name: names[segments[i]] || segments[i].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      item: BASE + running,
    })
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  }
}

const howTos: Record<string, object> = {
  '/merge': {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Merge PDF Files Online Free',
    description: 'Combine multiple PDF files into one document in your browser without uploading.',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Upload PDFs', text: 'Drag and drop or browse to select the PDF files you want to merge.' },
      { '@type': 'HowToStep', position: 2, name: 'Reorder and select pages', text: 'Drag files to reorder them, then select which pages to include.' },
      { '@type': 'HowToStep', position: 3, name: 'Merge and download', text: 'Click Merge & Download to combine the selected pages into one PDF.' },
    ],
  },
  '/split': {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Split a PDF Online Free',
    description: 'Extract specific pages or split a PDF into separate files in your browser.',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Upload PDF', text: 'Upload the PDF file you want to split or extract pages from.' },
      { '@type': 'HowToStep', position: 2, name: 'Select pages', text: 'Choose whether to extract selected pages or split the document.' },
      { '@type': 'HowToStep', position: 3, name: 'Download', text: 'Download the extracted pages as a new PDF or both halves of the split.' },
    ],
  },
  '/compress': {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Compress a PDF Online Free',
    description: 'Reduce PDF file size in your browser while keeping text searchable.',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Upload PDF', text: 'Upload the PDF you want to reduce in size.' },
      { '@type': 'HowToStep', position: 2, name: 'Choose compression level', text: 'Select lossless, balanced, or maximum reduction.' },
      { '@type': 'HowToStep', position: 3, name: 'Download compressed PDF', text: 'Click Compress & Download to save the smaller file.' },
    ],
  },
  '/to-word': {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Convert PDF to Word Online Free',
    description: 'Convert a PDF to an editable Word document in your browser with OCR for scanned pages.',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Upload PDF', text: 'Upload the PDF you want to convert to Word format.' },
      { '@type': 'HowToStep', position: 2, name: 'Automatic OCR', text: 'Scanned pages are processed with OCR to extract text.' },
      { '@type': 'HowToStep', position: 3, name: 'Download Word document', text: 'Download the editable .docx file with your converted content.' },
    ],
  },
  '/word-to-pdf': {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Convert Word to PDF Without Uploading',
    description: 'Preview and convert a DOCX Word document to PDF locally in your browser.',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Choose a DOCX', text: 'Choose the .docx Word document you want to convert.' },
      { '@type': 'HowToStep', position: 2, name: 'Review the preview', text: 'Inspect the locally rendered pages for layout differences.' },
      { '@type': 'HowToStep', position: 3, name: 'Create the PDF', text: 'Convert and download the PDF created in your browser.' },
    ],
  },
  '/to-image': {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Convert PDF to Image Online Free',
    description: 'Convert PDF pages to PNG or JPEG images in your browser.',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Upload PDF', text: 'Upload the PDF you want to convert to images.' },
      { '@type': 'HowToStep', position: 2, name: 'Preview format and clarity', text: 'Select PNG or JPEG, choose the image scale, and inspect the live output preview.' },
      { '@type': 'HowToStep', position: 3, name: 'Download', text: 'Download individual images or all pages as a ZIP file.' },
    ],
  },
  '/watermark': {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Add Watermark to PDF Online Free',
    description: 'Drag a text or image watermark onto a PDF page preview, resize it visually and apply it locally in your browser.',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Upload PDF', text: 'Upload the PDF you want to watermark.' },
      { '@type': 'HowToStep', position: 2, name: 'Place and resize visually', text: 'Drag the watermark frame on the page preview, resize it from the corner, then adjust angle and opacity.' },
      { '@type': 'HowToStep', position: 3, name: 'Download', text: 'Choose the pages and download the watermarked PDF.' },
    ],
  },
  '/manage': {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Manage PDF Pages Online Free',
    description: 'Delete, rotate, reorder, and extract PDF pages in your browser.',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Upload PDF', text: 'Upload the PDF you want to manage pages from.' },
      { '@type': 'HowToStep', position: 2, name: 'Select pages', text: 'Select pages to delete, extract, or rotate.' },
      { '@type': 'HowToStep', position: 3, name: 'Download', text: 'Download the modified PDF with your changes applied.' },
    ],
  },
  '/unwatermark': {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Inspect and Remove Supported PDF Watermark Annotations',
    description: 'Remove annotation-type watermarks from a PDF in your browser.',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Upload PDF', text: 'Upload the PDF that contains watermark annotations.' },
      { '@type': 'HowToStep', position: 2, name: 'Automatic detection', text: 'The tool identifies and removes Stamp and Watermark annotations on every page.' },
      { '@type': 'HowToStep', position: 3, name: 'Download', text: 'Download the cleaned PDF without watermarks.' },
    ],
  },
}

const schemas: Record<string, object> = {
  '/': {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Lab of PDF — Free Online PDF Tools: Merge, Split, Compress, Edit & Convert',
    url: BASE,
    description:
      'Free online PDF editor and converter. Merge PDF, compress PDF, split PDF, convert PDF to Word, edit PDF pages, remove watermarks, and manage PDF pages. All processing happens in your browser — no upload, no sign-up.',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'All',
    browserRequirements: 'Requires JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: {
      '@type': 'Organization',
      name: 'Lab of PDF',
      url: BASE,
      logo: BASE + '/logo-google.png',
    },
    image: BASE + '/logo-v2.png',
    featureList: [
      'PDF Editor — Edit, rotate, delete, and reorder PDF pages online',
      'Thesis PDF Check — Review file size, pages, searchable text, and orientation',
      'Visa Document Pack — Organize application PDFs for embassy upload limits',
      'Portal-Ready PDF — Compress for government, visa, and university portals',
      'PDF Merge — Combine multiple PDFs into one file',
      'PDF Split — Extract specific pages from a PDF',
      'PDF Compress — Reduce PDF file size losslessly or with scan copy modes',
      'PDF to Word — Convert PDF to editable Word document with OCR',
      'PDF to Image — Convert PDF pages to PNG or JPEG',
      'Add Watermark — Add text watermark to PDF pages',
      'Remove Watermark — Strip annotation overlays from PDF',
      'Manage Pages — Delete, rotate, extract PDF pages',
    ],
  },
  '/portal-ready-pdf': {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'Does Lab of PDF upload my PDF?', acceptedAnswer: { '@type': 'Answer', text: 'No. Portal-Ready PDF reads and processes the document locally in browser memory.' } },
      { '@type': 'Question', name: 'Can the tool guarantee an exact PDF file size?', acceptedAnswer: { '@type': 'Answer', text: 'No. The tool measures the output against the selected limit and clearly reports when further reduction is needed.' } },
      { '@type': 'Question', name: 'Which upload limit should I use?', acceptedAnswer: { '@type': 'Answer', text: 'Use the limit displayed by the actual upload portal. Verified presets link to their official source.' } },
      { '@type': 'Question', name: 'Which countries visa portals are supported?', acceptedAnswer: { '@type': 'Answer', text: 'Verified presets include Canada IRCC (4MB/5MB), United States CEAC (2MB), and New Zealand Immigration (10MB). Other countries can use a custom limit.' } },
    ],
  },
  '/visa-prep': {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Visa Document PDF Pack Organizer',
    url: BASE + '/visa-prep',
    description: 'Organize, label, reorder and prepare visa application PDF documents against selected portal file-size limits entirely in your browser.',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'All',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  },
  '/thesis-pdf-check': {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Thesis PDF Check Tool',
    url: BASE + '/thesis-pdf-check',
    description: 'Check thesis PDF file size, page count, searchable text, page format, and orientation before university submission entirely in your browser.',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'All',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  },
  '/compress/visa': {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Visa PDF Compressor',
    url: BASE + '/compress/visa',
    description: 'Compress visa application PDF files to meet strict embassy upload limits locally in your browser.',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'All',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  },
}

export default function JsonLd() {
  const location = useLocation()
  const path = location.pathname
  const breadcrumb = breadcrumbFor(path)
  const howTo = howTos[path]
  const pageSchema = schemas[path]

  const scripts: object[] = pageSchema ? [pageSchema] : []
  if (breadcrumb) scripts.push(breadcrumb)
  if (howTo) scripts.push(howTo)

  return (
    <>
      {scripts.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
    </>
  )
}
