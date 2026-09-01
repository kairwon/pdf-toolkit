# Lab of PDF — Agent Handoff

Read this file before changing or deploying the project. Keep it updated after
every meaningful implementation or production change.

## Project identity

- Product: Lab of PDF
- Production domain: `https://labofpdf.com`
- Git remote: `https://github.com/kairwon/pdf-toolkit.git`
- Production branch: `main`
- Stack: React 19, TypeScript, Vite 8, primarily client-side PDF processing,
  plus an isolated LibreOffice Writer service for Word-to-PDF conversion
- Privacy promise: PDF files remain in the browser and are not uploaded. The
  Word-to-PDF tool is the documented exception: it temporarily uploads the
  selected DOC/DOCX over HTTPS, converts it in a unique server directory, and
  deletes that directory after success, failure, or timeout.

## Canonical working copy

The canonical source is GitHub `main`. In this Codex environment its checked-out
worktree is `/Users/kai/Documents/Codex/pdf-toolkit-source`, with Git metadata
stored separately at `/Users/kai/Documents/Codex/pdf-toolkit` because project
directories cannot contain a writable `.git` directory. Use:

```bash
git --git-dir=/Users/kai/Documents/Codex/pdf-toolkit \
  --work-tree=/Users/kai/Documents/Codex/pdf-toolkit-source status
```

`/Users/kai/Desktop/pdf-toolkit` is an older local copy and is not a deployment
source. Ignore `/Users/kai/Desktop/pdf-toolkit-bak`; it is only a backup.

Every production build writes `dist/release.json`. The deployment script checks
that its commit matches the intended Git release before and after switching
Nginx to the new static files. Verify the live version at
`https://labofpdf.com/release.json`.

The intended production release represented by this handoff uses the immutable
tag `production-2026-09-01-auto-word-preview`. Verify its exact
commit in the live `release.json` manifest and in GitHub before every subsequent
deployment.

The deployment script uses `/var/www/labofpdf-next` and
`/var/www/labofpdf-prev` only during its atomic switch. Both are removed after
online verification succeeds. The server keeps no permanent release archive;
rollback means rebuilding and redeploying the previous immutable GitHub
production tag.

The deployment command requires a new immutable
`production-YYYY-MM-DD-description` tag that identifies the current clean HEAD
locally and on GitHub. Never move or reuse a production tag.

## Current product state

- Homepage has the green Lab of PDF identity, a full-area clickable/drop PDF
  zone, larger typography, clearer tool buttons, realistic anonymous student
  testimonials, and responsive layouts.
- Featured workflows include thesis submission, visa preparation, upload
  portal preparation, and page management.
- Core tools include compress, merge, split, manage pages, PDF to image,
  PDF to Word, Word to PDF, watermark removal, watermarking, visual editing, signing,
  redaction, OCR, scan cleanup, cropping, comparison, forms, metadata, and
  reusable multi-file workflows.
- `/edit`, `/sign-pdf`, and `/redact-pdf` share a direct-manipulation editor.
  Users can drag and resize text, images, highlights, shapes, typed or drawn
  signatures, freehand ink, and secure redaction areas. The editor includes
  undo/redo, object duplication, page navigation, and page-number placement.
  Secure redaction rasterizes affected pages before drawing opaque boxes so
  covered source content is not left recoverable underneath.
- The visual editor supports 70–160% zoom, optional grid snapping, six-way
  object alignment, copying an object to the next or every page, and standard
  keyboard undo/redo and delete shortcuts. Text, colour, size, and opacity
  inspector changes participate in undo history.
- The editor has a per-page Layers panel. Users can select every object type
  including ink, hide or lock layers, delete them, and move them backward,
  forward, to the back, or to the front. Hidden objects are excluded from the
  PDF export; locked objects cannot be moved, resized, nudged, or deleted until
  unlocked. Cmd/Ctrl+C and V copy and paste an object onto the current page.
- Text, images, signatures, highlights, shapes, and redaction areas can be
  rotated around their visual centre with an angle slider, quick 90-degree
  controls, and reset. The same inspector exposes precise Left, Top, Width, and
  Height percentage inputs. Rotation and geometry are reflected in the live
  canvas and final PDF, respect layer locks, and participate in Undo/Redo.
- The editor warns before rewriting PDFs that contain form fields, digital
  signatures, bookmarks, attachments, or page labels. Added Chinese, Arabic,
  emoji, and other non-Latin text is rendered locally into a visual layer so
  downloads remain reliable without uploading document content or fonts.
- `/ocr-pdf` adds a searchable text layer to scanned pages with selectable OCR
  languages, while `/scan-cleanup` provides grayscale, background removal,
  contrast, deskew, render scale, quality, and a live preview. OCR is loaded
  only when the user starts the local operation.
- `/crop-pdf` provides a draggable crop frame, per-page or all-page scope,
  margins, and A4/Letter fitting. `/compare-pdf` renders two versions locally
  and reports page-level visual differences with red overlays.
- `/pdf-forms` fills existing AcroForm fields and lets users place new text or
  checkbox fields visually, with optional flattening. `/document-info` edits
  title, author, subject, keywords and dates, and can remove bookmarks,
  attachments, or page labels after inspecting the file.
- `/workflows` runs a repeatable local pipeline over multiple files in the
  documented order: rotate, page numbers, watermark, then compression. It
  includes university, visa, and archive presets, local custom settings, and
  ZIP output.
- The installable offline shell caches only same-origin static GET resources;
  API calls and `release.json` are excluded, and PDF file bytes remain local
  browser objects rather than service-worker cache entries.
- Merge PDF uses a stable identity for every page across files. Selection,
  thumbnail reordering, and preview rotation are applied to the downloaded PDF
  in exactly the order shown in the interface.
- Manage Pages applies the visible page order and rotations to full-document,
  extraction, and removal downloads instead of silently exporting the original
  order or orientation.
- Manage Pages keeps the current layout available after preparing a download,
  offers a one-click layout reset, and provides accessible move-left/right
  controls so page reordering does not depend on desktop drag-and-drop.
- Manage Pages accepts visible-position ranges such as `1-5, 8, 12-14` or
  `all`, making selection practical for long documents even after reordering.
- Manage Pages keeps up to 20 layout-history steps for page order and rotation,
  with Undo/Redo buttons and standard Ctrl/Cmd keyboard shortcuts that do not
  intercept typing in the page-range field.
- Manage Pages shows operation-specific progress while opening or generating a
  PDF, locks layout-changing controls until that operation finishes, and
  ignores stale file-open results when files are selected in quick succession.
- Manage Pages can remove selected pages from the working layout without an
  immediate download, move selected pages as one stable block to a specified
  position, and quickly select odd, even, or inverse visible-page sets. These
  edits participate in Undo/Redo, Reset, and the final Save & Download output.
- Manage Pages keeps page order, rotation, removal, and layout history in one
  tested reducer. Regression coverage includes compound edit sequences,
  undoable reset, the 20-step history limit, and redo invalidation after a new
  edit.
- Manage Pages models every visible page as an independent instance. Users can
  duplicate selected pages, insert portrait or landscape A4/Letter blank pages,
  and restore individual or all removed pages from a thumbnail tray. Duplicate
  source pages and inserted blanks are preserved in the final PDF output.
- Manage Pages supports direct page navigation, Home/End/Page Up/Page Down and
  arrow-key navigation, Shift-click range selection, and replace/add/remove
  range-selection modes. Selection uses visible positions after reordering.
- Manage Pages inspects forms, signatures, bookmarks, attachments, and page
  labels before editing and warns when structural features may not survive a
  rewrite. Password-protected PDFs are not decrypted: the UI asks users to
  remove the password locally first because the current PDF editing library
  cannot safely preserve encrypted documents.
- Manage Pages reports per-page output progress, allows generation to be
  cancelled between pages, and includes the applied edits in the download
  summary. Opening errors distinguish encryption, malformed files, memory
  pressure, and generic failures.
- Split PDF preserves the visible thumbnail order and applied rotations in both
  extracted and split outputs. It also supports visible-position ranges,
  odd/even/inverse selection, per-page progress, and cancellation.
- PDF to Images emits real PNG bytes when PNG is selected, supports ranges and
  odd/even/inverse selection, and processes long documents sequentially with
  progress and cancellation. Its visual output workspace renders a live sample
  with the selected PNG/JPEG format, resolution and JPEG quality, and reports
  the exact resulting pixel dimensions before download.
- Images to PDF is a first-class local tool at `/images-to-pdf`. It accepts
  JPEG, PNG, and WebP images and shows each as a composed PDF page with the
  selected A4/Letter/image-sized sheet, orientation, and white border. Pages
  support pointer/touch drag ordering, accessible move buttons, rotation,
  progress, and cancellation.
- PDF previews reuse one parsed PDF.js document per selected file, and the
  filmstrip lazily renders nearby visible thumbnails instead of repeatedly
  reading the same file or leaving long-document thumbnails blank.
- Tool routes now load the PDF.js and pdf-lib processing engine only when a
  document operation first needs it. The shared upload component is a small
  native drag-and-drop/file-picker implementation instead of a large shared
  bundle, and the homepage is its own lazy route. This reduces the former
  868 KB FileUpload shared chunk to about 2 KB while preserving keyboard,
  click, and drag-and-drop upload paths.
- Single-document analysis and conversion workflows now share a compact local
  PDF preview with previous/next page navigation. Portal Ready, compression and
  thesis checks, PDF to Word, watermark annotation removal, and document
  information let users visually confirm the uploaded file before processing.
  Multi-file package and workflow pages retain lighter file lists to avoid
  rendering many large PDFs at once.
- Portal Ready places destination settings and document upload/inspection side
  by side on desktop, while compression, PDF to Word, annotation removal, and
  document information use a consistent preview-plus-controls workspace. The
  preview stays visible beside controls on wide screens and all layouts collapse
  to an overflow-free single column on tablets and phones.
- Watermark removal now inspects `/Stamp` and `/Watermark` annotations, shows
  every candidate, recommends only likely watermarks, preserves unselected
  stamps, reports the actual number removed, and warns when a digital signature
  may be invalidated. It deliberately does not claim to remove content-stream
  or scanned-image watermarks.
- Watermark creation provides a real PDF page preview for text and PNG/JPEG
  marks. Users can drag the watermark frame, resize it from its corner, nudge it
  with the keyboard, switch preview pages, use nine quick positions, or repeat
  it across the page. Normalized position and width are applied consistently to
  selected pages with different dimensions; angle, opacity, colour, and page
  range remain configurable.
- Target-size compression now tries progressively stronger modes up to the
  quality level selected by the user and stops at the first result that meets
  the target. Lossless preserves searchable text; balanced and maximum modes
  create image-based copies and the UI says so explicitly.
- `/compress/scanned` is a dedicated scanned-document workflow informed by
  Search Console query demand. It samples the PDF locally, defaults scanned or
  mixed documents to balanced scan compression, defaults searchable documents
  to lossless mode, offers common MB targets, and explains when selectable text
  may be lost.
- PDF to Word now generates a real `.docx` file and offers multiple OCR
  languages for scanned pages. Long OCR conversions can be cancelled, report
  the current page, and always terminate the OCR worker. Complex tables,
  columns, equations, and exact typography remain documented limitations.
- `/word-to-pdf` accepts `.doc` and `.docx`, temporarily uploads the document
  over HTTPS, and converts it with headless LibreOffice Writer using the real
  `writer_pdf_Export` filter. It previews the exact generated PDF rather than a
  browser approximation, so searchable text, pagination, tables, headers, and
  typography are preserved as faithfully as the installed fonts allow. The
  interface clearly discloses this tool's upload exception. The API uses a
  unique per-job LibreOffice profile and temp directory, deletes both in a
  `finally` path, limits files to 25 MB, permits one concurrent conversion,
  rate-limits requests, and kills work after 60 seconds.
- Word-to-PDF begins conversion immediately after a valid file is selected and
  opens the real generated PDF preview automatically. The main workflow avoids
  exposing rendering-engine, concurrency, and server implementation details;
  users see only concise preparing, preview, retry, change-file, and download
  states. Privacy and security pages retain the technical disclosure.
- `npm test` covers watermark candidate detection and selective removal with a
  synthetic PDF fixture. Keep adding representative, non-sensitive fixtures as
  PDF manipulation behavior expands.
- The download result dialog asks for optional outcome feedback only after a
  user downloads a result. It records the tool path, yes/no outcome, reason,
  optional 300-character comment, and release commit. It never sends the PDF,
  file name, document content, or IP address.
- Tool icons use task-specific PDF metaphors rather than generic document icons.
- `/tools` includes instant task search with `/` and Cmd/Ctrl+K shortcuts,
  filtered result counts, and a useful empty state. Duplicate directory entries
  were removed.
- Browser back actions should use history when available and fall back safely.
- The PandaCard feature remains in source, but large obsolete
  `thankspanda.mov`, `thankspanda.mp4`, and `thankspanda.json` assets were
  removed from the current tree.

## SEO and production behavior

- The homepage exposes one static `WebSite` structured-data node and
  `og:site_name=Lab of PDF` in its initial HTML so Google can distinguish the
  brand name from the displayed domain. Client-side navigation keeps that node
  homepage-only, and prerendered non-home routes replace it with page-specific
  structured data.
- `npm run build` runs TypeScript, Vite, and `scripts/prerender-seo.mjs`.
- The prerender step currently creates 39 indexable route HTML files, two
  noindex route files, and a noindex 404 document.
- Trust and discovery content now includes `/guides`, `/editorial-policy`,
  `/about/editorial-team`, and five long-tail study/submission/compression guides. The
  guide HTML includes crawlable fallback copy plus canonical metadata and
  Article structured data; keep the fallback copy aligned with visible pages.
- The search-growth release adds `/guides/pdf-submission-checklist`, a
  printable and downloadable ten-step resource designed for legitimate links
  from university, application-support, library, privacy, and documentation
  pages. Every guide page now exposes sharing controls, and the repository
  includes `marketing/BACKLINK_OUTREACH.md` with quality-first directory and
  editorial outreach copy.
- Crawl improvements replace homepage task/tool buttons
  with real links, give prerendered tool routes crawlable fallback copy and
  internal links, redirect the duplicate `/edit-pdf` alias to `/edit`, and
  refresh sitemap last-modified dates. Do not re-add `/edit-pdf` to the sitemap.
- Nginx redirects `/about` and `/about/` to `/about/editorial-team`; this avoids
  the directory-style `/about/` URL returning 403 and resolves the corresponding
  Search Console indexing issue without creating a duplicate About page.
- A 2026-08-13 Search Console review reported 5 indexed pages, 21 excluded
  pages (including 16 discovered but not indexed), 18 clicks, 43 impressions,
  41.9% CTR, average position 3.7, and one recognized external link from
  `uicomet.com`. The sitemap was last read on 2026-07-28 and recognized 21 URLs;
  resubmit it after this SEO release is deployed.
- A 2026-08-14 Search Console review reported 19 clicks, 57 impressions, 33.3%
  CTR and average position 19.4. The homepage received 18 clicks; the scanned
  PDF guide received 10 impressions and no clicks. Visible queries included
  “make scanned pdf smaller”, “how to resize a scanned document”, and “how to
  reduce mb size of scanned pdf”. The sitemap was successfully read on
  2026-08-13 with 27 discovered URLs, while the links report still showed one
  external link from `uicomet.com`. The scanned workflow, guide metadata,
  internal links, GitHub README deep link, and outreach copy were updated from
  these signals.
- A 2026-08-25 Search Console review reported 20 clicks, 388 impressions, 5.2%
  CTR, and average position 68 over the available three-month period. The
  scanned PDF size guide accounted for 197 impressions and no clicks, with
  queries centered on reducing or resizing large scanned documents. Its title,
  description, direct answer, scan-size explanation, crop/OCR links, static
  fallback HTML, and modified date were updated. Images-to-PDF and PDF-to-Word
  metadata were also refined after receiving 43 and 33 impressions. Indexing
  showed 25 indexed and 10 excluded URLs; the sitemap was successfully read on
  2026-08-24 with 29 discovered URLs. The links report still showed one external
  domain, so the GitHub deep links and quality-first directory outreach package
  were expanded and a tracking CSV was added.
- The same review found no manual action or security issue. PageSpeed mobile
  scored 89 performance, 96 accessibility, 96 best practices, and 92 SEO. The
  release fixes remove the broken Umami request and render-blocking Google font,
  improve small-label contrast and privacy-link wording, remove a mobile
  overflow, and update deployment to cache hashed JS/CSS for one year.
- Do not replace the build command with plain `vite build`; that would remove
  route-specific SEO output.
- `public/sitemap.xml`, `public/robots.txt`, canonical tags, Open Graph data,
  Twitter cards, and structured data are configured for `labofpdf.com`.
- `public/og-v3.jpg` is the optimized social preview image.
- OCR/Tesseract is loaded dynamically and must remain off the initial bundle.
- Nginx must resolve `$uri.html` before returning a 404. Use
  `deploy/nginx-labofpdf.conf` as a reference, merge it with the existing TLS
  server block, run `nginx -t`, and only then reload Nginx.
- CSP is intentionally report-only until PDF conversion, OCR, analytics,
  sharing, and downloads have been verified in production.

## Server disk-space policy

Production uses one fixed active directory, not a permanent directory per
release. Vite empties local `dist/` before a successful build, and rsync uploads
only that verified output, so obsolete hashed assets do not accumulate.

The current server is `root@167.99.1.62`, Nginx serves
`/var/www/labofpdf`, and its site configuration is
`/etc/nginx/sites-enabled/labofpdf.conf`. Run
`deploy/deploy-to-server.sh` from a local terminal for the validated atomic
upload workflow. It removes its temporary and previous release only after
online verification succeeds.
Nginx backups must stay outside `/etc/nginx/sites-enabled`; Nginx loads every
file in that directory, including files without a `.conf` suffix.

The local API runs as `www-data` through `visitor-counter.service`, listening
only on `127.0.0.1:3001`. Code is installed at `/opt/labofpdf-api`; counters and
the feedback SQLite database live at `/var/lib/labofpdf`. Nginx proxies `/api/`.
LibreOffice Writer 24.2 and Liberation, Carlito, Caladea, Noto Core/CJK/Emoji
fonts provide Word rendering. Provision a replacement server with
`deploy/install-word-converter.sh`; the deployment script refuses to switch a
release if `/usr/bin/libreoffice` is absent. The exact Word endpoint has a
25 MB Nginx body limit and 75-second proxy timeouts, and every deployment runs
a real DOCX-to-PDF smoke conversion before the static-site switch.
The deployment script validates and switches both the static site and API, and
restores both if online verification fails. To view aggregate feedback without
printing comments, run:

```bash
sudo -u www-data node /opt/labofpdf-api/feedback-report.mjs
```

After a successful static build, `node_modules/` is not required by Nginx and
may be removed. The next deployment can recreate it with `npm ci`. Never remove
`dist/`, the active Nginx document root, or the repository before a replacement
build has succeeded.

Do not introduce timestamped server release directories or permanent archives.
Use immutable GitHub production tags as the rollback record. Temporary switch
directories must use the exact paths documented above and must be removed after
successful verification.

The repository's `.git` directory retains reachable history. `git gc` can
compact it, but deleting old large files from Git history requires a coordinated
history rewrite and is not part of ordinary deployment.

## Verification checklist

1. Run `npm ci` and `npm run build`.
2. Confirm the build reports 38 indexable routes, 2 noindex routes, and 404.
3. Confirm `dist/to-image.html`, `dist/edit.html`, and `dist/ocr-pdf.html` have their own
   titles, descriptions, and canonicals.
4. Deploy only after the build succeeds.
5. Run `nginx -t` before any reload when Nginx configuration changed.
6. Check `/`, `/edit`, `/ocr-pdf`, `/crop-pdf`, one featured workflow, privacy,
   and an unknown URL.
7. Test click-to-upload, real drag-and-drop, processing, download, sharing,
   mobile navigation, and browser Back.
8. Check cache and security headers without making PDF assets uncacheable.
9. Confirm `/release.json` reports the expected production commit.
10. Confirm `/api/health` reports SQLite feedback storage and perform a dry-run
    feedback POST without creating a row.

## Agent working rules

- Preserve unrelated user changes and inspect `git status` before editing.
- Do not use Desktop backup folders as deployment sources by assumption.
- Keep PDF processing local unless the user explicitly changes that promise.
- Build and visually verify meaningful UI changes before committing.
- Update this file when routes, deployment, infrastructure, privacy behavior,
  analytics, advertising, or the canonical working location changes.
