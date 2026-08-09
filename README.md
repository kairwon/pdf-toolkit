# Lab of PDF

> Free online PDF tools — merge, split, compress, watermark, and convert PDFs entirely in your browser. No document uploads or sign-up; practical capacity depends on the device and browser.

## Features

| Tool | Description |
|---|---|
| **Merge PDF** | Combine multiple PDFs into one. Preview pages and pick exactly which ones to include. |
| **Split PDF** | Extract specific pages from a PDF or split it into two separate files. |
| **Compress PDF** | Reduce PDF file size losslessly — text stays selectable. |
| **PDF to Word** | Convert PDF to Word document. OCR applied automatically to scanned pages. |
| **Add Watermark** | Add a text watermark to every page of your PDF. |
| **Remove Watermark Annotations** | Inspect supported Stamp/Watermark annotations and remove only selected candidates. |
| **Manage Pages** | Delete, rotate, or extract pages from your PDF with a visual preview. |
| **PDF to Image** | Convert PDF pages to PNG or JPEG images. Download individually or as ZIP. |

All processing happens **locally in your browser** using [pdf-lib](https://github.com/Hopding/pdf-lib) and [pdfjs-dist](https://github.com/mozilla/pdf.js). Your files never leave your device.

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** (build tool)
- **TailwindCSS 4** (styling)
- **pdf-lib** / **pdfjs-dist** (PDF processing)
- **Tesseract.js** (OCR)
- **JSZip** (ZIP downloads)
- **Zustand** (state management)
- **lottie-web** (animations)
- **Lucide** (icons)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
```

Output goes to `dist/`.

The production build also creates route-specific HTML files such as
`dist/to-image.html`. Configure Nginx to resolve `$uri.html` before the SPA
fallback so search engines and link-preview bots receive the correct title,
description, canonical URL, and structured data without running JavaScript.

## Nginx production configuration

Use `deploy/nginx-labofpdf.conf` as the application portion of the HTTPS server
block. It includes:

- route-specific SEO HTML resolution;
- one-year immutable caching for hashed assets;
- no-cache handling for the application entry document;
- gzip compression;
- HSTS, permissions policy, MIME sniffing and framing protection;
- a report-only Content Security Policy that can be monitored before enforcement.

Run `nginx -t` before reloading Nginx. Keep the CSP in report-only mode until
PDF conversion, OCR, analytics, social sharing, and downloads have been tested
on the deployed domain.

### Server disk usage

Deploy into one fixed working directory instead of creating a permanent copy
for every release. Vite clears `dist/` before rebuilding, so old hashed assets
do not accumulate. Once the build has succeeded and Nginx is serving `dist/`,
`node_modules/` can be removed; restore it with `npm ci` for the next build.
If release directories are used for rollback, retain the active release and at
most two previous releases.

See `PROJECT_HANDOFF.md` for the current deployment state and the complete
cross-agent verification checklist.

### Canonical deployment chain

`GitHub main` → canonical local worktree → lint and tests → `npm run build` →
validated `dist/` → atomic upload → Nginx `/var/www/labofpdf`.

Run `deploy/deploy-to-server.sh production-YYYY-MM-DD-description` only from
the canonical worktree after pushing that new immutable tag. The build
writes `dist/release.json`, and deployment succeeds only when the online
manifest reports the same Git commit. The deployment also installs the local
Node API at `/opt/labofpdf-api` and restarts `visitor-counter.service` on port
3001 behind `/api/`. API state is kept in `/var/lib/labofpdf`, outside the
static release directories.

## Privacy

All PDF processing runs entirely client-side. No files are uploaded to the
server. After a result is downloaded, users can optionally report whether it
worked. Feedback stores the tool path, outcome, reason, optional short comment,
and release commit in a server-local SQLite database. It does not store the PDF,
file name, document content, or IP address.

Administrators can view privacy-safe 30-day aggregates on the server with:

```bash
sudo -u www-data node /opt/labofpdf-api/feedback-report.mjs
```

## License

MIT
