# Lab of PDF — Agent Handoff

Read this file before changing or deploying the project. Keep it updated after
every meaningful implementation or production change.

## Project identity

- Product: Lab of PDF
- Production domain: `https://labofpdf.com`
- Git remote: `https://github.com/kairwon/pdf-toolkit.git`
- Production branch: `main`
- Stack: React 19, TypeScript, Vite 8, client-side PDF processing
- Privacy promise: PDF files remain in the browser and are not uploaded

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

The production release prepared after the core reliability work uses the
immutable tag `production-2026-08-09-core-pdf-reliability`.

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
  PDF to Word, watermark removal, and watermarking.
- Watermark removal now inspects `/Stamp` and `/Watermark` annotations, shows
  every candidate, recommends only likely watermarks, preserves unselected
  stamps, reports the actual number removed, and warns when a digital signature
  may be invalidated. It deliberately does not claim to remove content-stream
  or scanned-image watermarks.
- Watermark creation supports text or PNG/JPEG marks, selected page ranges,
  placement (including tiled marks), angle, opacity, text colour, and text size.
- Target-size compression now tries progressively stronger modes up to the
  quality level selected by the user and stops at the first result that meets
  the target. Lossless preserves searchable text; balanced and maximum modes
  create image-based copies and the UI says so explicitly.
- PDF to Word now generates a real `.docx` file and offers multiple OCR
  languages for scanned pages. Complex tables, columns, equations, and exact
  typography remain documented limitations.
- `npm test` covers watermark candidate detection and selective removal with a
  synthetic PDF fixture. Keep adding representative, non-sensitive fixtures as
  PDF manipulation behavior expands.
- The download result dialog asks for optional outcome feedback only after a
  user downloads a result. It records the tool path, yes/no outcome, reason,
  optional 300-character comment, and release commit. It never sends the PDF,
  file name, document content, or IP address.
- Tool icons use task-specific PDF metaphors rather than generic document icons.
- Browser back actions should use history when available and fall back safely.
- The PandaCard feature remains in source, but large obsolete
  `thankspanda.mov`, `thankspanda.mp4`, and `thankspanda.json` assets were
  removed from the current tree.

## SEO and production behavior

- `npm run build` runs TypeScript, Vite, and `scripts/prerender-seo.mjs`.
- The prerender step currently creates 26 indexable route HTML files, three
  noindex route files, and a noindex 404 document.
- Trust and discovery content now includes `/guides`, `/editorial-policy`,
  `/about/editorial-team`, and five long-tail study/submission/compression guides. The
  guide HTML includes crawlable fallback copy plus canonical metadata and
  Article structured data; keep the fallback copy aligned with visible pages.
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
2. Confirm the build reports 26 indexable routes, 3 noindex routes, and 404.
3. Confirm `dist/to-image.html` has its own title, description, and canonical.
4. Deploy only after the build succeeds.
5. Run `nginx -t` before any reload when Nginx configuration changed.
6. Check `/`, `/to-image`, one featured workflow, privacy, and an unknown URL.
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
