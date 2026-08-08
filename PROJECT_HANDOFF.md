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

The clean release worktree is this repository. Do not deploy from similarly
named Desktop backup folders without first comparing them with this branch.

The release prepared on 2026-08-08 is commit `b16aecb`:

`Optimize SEO, performance, security, and production UI`

At handoff time the commit was built successfully but could not be pushed from
Codex because that session could not resolve `github.com`. Check `git status`,
`git log -1`, and `git status -sb` before continuing. If `main` is ahead of
`origin/main`, push it normally.

## Current product state

- Homepage has the green Lab of PDF identity, a full-area clickable/drop PDF
  zone, larger typography, clearer tool buttons, realistic anonymous student
  testimonials, and responsive layouts.
- Featured workflows include thesis submission, visa preparation, upload
  portal preparation, and page management.
- Core tools include compress, merge, split, manage pages, PDF to image,
  PDF to Word, watermark removal, and watermarking.
- Tool icons use task-specific PDF metaphors rather than generic document icons.
- Browser back actions should use history when available and fall back safely.
- The PandaCard feature remains in source, but large obsolete
  `thankspanda.mov`, `thankspanda.mp4`, and `thankspanda.json` assets were
  removed from the current tree.

## SEO and production behavior

- `npm run build` runs TypeScript, Vite, and `scripts/prerender-seo.mjs`.
- The prerender step currently creates 18 indexable route HTML files, three
  noindex route files, and a noindex 404 document.
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

Production should use one fixed Git working directory and one `dist/` directory,
not a new full release directory on every deploy. Vite empties `dist/` before a
successful build, so obsolete hashed assets do not accumulate.

After a successful static build, `node_modules/` is not required by Nginx and
may be removed. The next deployment can recreate it with `npm ci`. Never remove
`dist/`, the active Nginx document root, or the repository before a replacement
build has succeeded.

If the host currently creates timestamped release directories, keep the active
release plus at most two rollback releases. Resolve the active symlink and make
a backup before introducing automatic cleanup. Do not use a broad wildcard or
an unresolved environment variable as a deletion target.

The repository's `.git` directory retains reachable history. `git gc` can
compact it, but deleting old large files from Git history requires a coordinated
history rewrite and is not part of ordinary deployment.

## Verification checklist

1. Run `npm ci` and `npm run build`.
2. Confirm the build reports 18 indexable routes, 3 noindex routes, and 404.
3. Confirm `dist/to-image.html` has its own title, description, and canonical.
4. Deploy only after the build succeeds.
5. Run `nginx -t` before any reload when Nginx configuration changed.
6. Check `/`, `/to-image`, one featured workflow, privacy, and an unknown URL.
7. Test click-to-upload, real drag-and-drop, processing, download, sharing,
   mobile navigation, and browser Back.
8. Check cache and security headers without making PDF assets uncacheable.

## Agent working rules

- Preserve unrelated user changes and inspect `git status` before editing.
- Do not use Desktop backup folders as deployment sources by assumption.
- Keep PDF processing local unless the user explicitly changes that promise.
- Build and visually verify meaningful UI changes before committing.
- Update this file when routes, deployment, infrastructure, privacy behavior,
  analytics, advertising, or the canonical working location changes.

