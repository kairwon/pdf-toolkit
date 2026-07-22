export default function JsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Lab of PDF — Free Online PDF Tools',
    url: 'https://labofpdf.com',
    description:
      'Free online PDF tools to merge, split, compress, watermark, and manage PDF pages entirely in your browser.',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'All',
    browserRequirements: 'Requires JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'PDF Merge — Combine multiple PDFs into one file',
      'PDF Split — Extract specific pages from a PDF',
      'PDF Compress — Reduce PDF file size losslessly',
      'Add Watermark — Add text watermark to PDF pages',
      'Remove Watermark — Strip overlay watermarks',
      'Manage Pages — Delete, rotate, extract PDF pages',
      'PDF to Image — Convert PDF pages to PNG or JPEG',
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
