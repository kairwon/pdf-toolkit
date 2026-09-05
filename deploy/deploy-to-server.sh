#!/usr/bin/env bash
set -Eeuo pipefail

SERVER="root@167.99.1.62"
APP_ROOT="/var/www/labofpdf"
NEXT_ROOT="/var/www/labofpdf-next"
PREV_ROOT="/var/www/labofpdf-prev"
NGINX_CONF="/etc/nginx/sites-enabled/labofpdf.conf"
RELEASE_TAG="${1:-}"

cd "$(dirname "$0")/.."

if [[ ! "$RELEASE_TAG" =~ ^production-[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]+$ ]]; then
  echo "Usage: $0 production-YYYY-MM-DD-description" >&2
  exit 1
fi

git diff --quiet
git diff --cached --quiet
git fetch --tags origin

RELEASE_COMMIT="$(git rev-parse "$RELEASE_TAG^{commit}")"
HEAD_COMMIT="$(git rev-parse HEAD)"
REMOTE_COMMIT="$(git ls-remote origin "refs/tags/$RELEASE_TAG^{}" | awk '{print $1}')"
if [[ -z "$REMOTE_COMMIT" ]]; then
  REMOTE_COMMIT="$(git ls-remote origin "refs/tags/$RELEASE_TAG" | awk '{print $1}')"
fi
if [[ "$RELEASE_COMMIT" != "$HEAD_COMMIT" || "$RELEASE_COMMIT" != "$REMOTE_COMMIT" ]]; then
  echo "HEAD, the local tag and the remote production tag must identify the same commit." >&2
  exit 1
fi

echo "Building the production site..."
npm run lint
npm test
RELEASE_COMMIT="$RELEASE_COMMIT" npm run build
test -f dist/index.html
test -f dist/guides.html
test -f dist/guides/compress-pdf-for-university-upload.html
grep -q "\"commit\": \"$RELEASE_COMMIT\"" dist/release.json

echo "Preparing a temporary release directory..."
ssh "$SERVER" "set -eu; rm -rf '$NEXT_ROOT' /tmp/labofpdf-api-stage; mkdir -p '$NEXT_ROOT' /tmp/labofpdf-api-stage"

echo "Uploading the verified build..."
rsync -az --delete dist/ "$SERVER:$NEXT_ROOT/"
rsync -az --delete server/ "$SERVER:/tmp/labofpdf-api-stage/"
rsync -az deploy/visitor-counter.service "$SERVER:/tmp/visitor-counter.service.next"

echo "Validating and switching the release..."
ssh "$SERVER" 'bash -s' -- "$RELEASE_COMMIT" <<'REMOTE'
set -Eeuo pipefail

RELEASE_COMMIT="$1"
APP_ROOT="/var/www/labofpdf"
NEXT_ROOT="/var/www/labofpdf-next"
PREV_ROOT="/var/www/labofpdf-prev"
NGINX_CONF="/etc/nginx/sites-enabled/labofpdf.conf"
NGINX_BACKUP="/etc/nginx/labofpdf.conf.pre-deploy"
API_ROOT="/opt/labofpdf-api"
API_PREV="/opt/labofpdf-api-prev"
API_STAGE="/tmp/labofpdf-api-stage"
API_UNIT="/etc/systemd/system/visitor-counter.service"
API_UNIT_BACKUP="/etc/systemd/system/visitor-counter.service.pre-deploy"
API_DATA="/var/lib/labofpdf"

test -f "$NEXT_ROOT/index.html"
test -f "$NEXT_ROOT/guides.html"
test -f "$NEXT_ROOT/guides/compress-pdf-for-university-upload.html"
grep -q "\"commit\": \"$RELEASE_COMMIT\"" "$NEXT_ROOT/release.json"
node --check "$API_STAGE/labofpdf-api.mjs"
node --check "$API_STAGE/feedback-report.mjs"
command -v libreoffice >/dev/null
libreoffice --headless --version

echo "Installing and validating the local feedback API..."
mkdir -p "$API_DATA"
if [[ ! -f "$API_DATA/counters.json" ]]; then
  VISITORS="$(cat /tmp/visitor_count.txt 2>/dev/null || echo 108)"
  BAMBOO="$(cat /tmp/bamboo_count.txt 2>/dev/null || echo 300)"
  [[ "$VISITORS" =~ ^[0-9]+$ ]] || VISITORS=108
  [[ "$BAMBOO" =~ ^[0-9]+$ ]] || BAMBOO=300
  printf '{"visitors":%s,"bamboo":%s}\n' "$VISITORS" "$BAMBOO" > "$API_DATA/counters.json"
fi
chown -R www-data:www-data "$API_DATA"
chmod 750 "$API_DATA"
chmod 640 "$API_DATA/counters.json"

API_HAD_ROOT=0
rm -rf "$API_PREV"
if [[ -d "$API_ROOT" ]]; then
  API_HAD_ROOT=1
  cp -a "$API_ROOT" "$API_PREV"
fi
cp -a "$API_UNIT" "$API_UNIT_BACKUP"
mkdir -p "$API_ROOT"
install -m 0644 "$API_STAGE/labofpdf-api.mjs" "$API_ROOT/server.mjs"
install -m 0644 "$API_STAGE/feedback-report.mjs" "$API_ROOT/feedback-report.mjs"
install -m 0644 /tmp/visitor-counter.service.next "$API_UNIT"
chown -R root:root "$API_ROOT"

rollback_api() {
  cp -a "$API_UNIT_BACKUP" "$API_UNIT"
  rm -rf "$API_ROOT"
  if [[ "$API_HAD_ROOT" == 1 && -d "$API_PREV" ]]; then mv "$API_PREV" "$API_ROOT"; fi
  systemctl daemon-reload
  systemctl restart visitor-counter.service
}

systemctl daemon-reload
systemctl restart visitor-counter.service
API_READY=0
for attempt in $(seq 1 10); do
  if curl -fsS http://127.0.0.1:3001/api/health | grep -q '"wordConversionEngine":"libreoffice"'; then API_READY=1; break; fi
  sleep 1
done
if [[ "$API_READY" != 1 ]]; then
  journalctl -u visitor-counter.service -n 40 --no-pager >&2 || true
  rollback_api
  exit 1
fi

WORD_SMOKE_DOCX="/tmp/labofpdf-word-smoke.docx"
WORD_SMOKE_PDF="/tmp/labofpdf-word-smoke.pdf"
python3 - "$WORD_SMOKE_DOCX" <<'PY'
import sys
from zipfile import ZIP_DEFLATED, ZipFile

target = sys.argv[1]
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    archive.writestr('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
    archive.writestr('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
    archive.writestr('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Lab of PDF LibreOffice deployment check</w:t></w:r></w:p><w:sectPr/></w:body></w:document>')
PY
if ! curl -fsS \
  -H 'Origin: https://labofpdf.com' \
  -H 'Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document' \
  -H 'X-File-Name: deployment-check.docx' \
  --data-binary "@$WORD_SMOKE_DOCX" \
  http://127.0.0.1:3001/api/word-to-pdf > "$WORD_SMOKE_PDF" || ! grep -aq '^%PDF-' "$WORD_SMOKE_PDF"; then
  rm -f "$WORD_SMOKE_DOCX" "$WORD_SMOKE_PDF"
  echo "LibreOffice Word conversion validation failed; restoring the previous API." >&2
  rollback_api
  exit 1
fi
rm -f "$WORD_SMOKE_DOCX" "$WORD_SMOKE_PDF"

if ! curl -fsS \
  -H 'Origin: https://labofpdf.com' \
  -H 'Content-Type: application/json' \
  -H 'X-Feedback-Dry-Run: 1' \
  --data "{\"tool\":\"/deployment-check\",\"outcome\":\"yes\",\"reason\":\"result_worked\",\"releaseCommit\":\"$RELEASE_COMMIT\"}" \
  http://127.0.0.1:3001/api/feedback | grep -q '"stored":false'; then
  echo "Feedback API validation failed; restoring the previous API." >&2
  rollback_api
  exit 1
fi

cp -a "$NGINX_CONF" "$NGINX_BACKUP"
python3 - <<'PY'
from pathlib import Path

path = Path('/etc/nginx/sites-enabled/labofpdf.conf')
text = path.read_text()

old_try = 'try_files $uri $uri/ /index.html;'
new_try = 'try_files $uri.html $uri $uri/ =404;'
if old_try in text:
    text = text.replace(old_try, new_try, 1)
elif 'try_files $uri $uri.html $uri/ =404;' in text:
    text = text.replace('try_files $uri $uri.html $uri/ =404;', new_try, 1)
elif new_try not in text:
    raise SystemExit('Expected Lab of PDF try_files rule was not found')

old_robots = '''location = /robots.txt { add_header Content-Type text/plain; return 200 "User-agent: *
Allow: /
"; }'''
new_robots = '''location = /robots.txt { add_header Content-Type text/plain; return 200 "User-agent: *
Allow: /
Sitemap: https://labofpdf.com/sitemap.xml
"; }'''
text = text.replace(old_robots, new_robots)

if 'error_page 404 /404.html;' not in text:
    text = text.replace(
        '    location / {\n        try_files $uri.html $uri $uri/ =404;',
        '    error_page 404 /404.html;\n\n    location = /404.html { internal; }\n\n    location / {\n        try_files $uri.html $uri $uri/ =404;',
        1,
    )

old_edit_redirect = '    location = /edit-pdf { return 301 https://labofpdf.com/manage; }'
edit_redirect = '    location = /edit-pdf { return 301 https://labofpdf.com/edit; }'
if old_edit_redirect in text:
    text = text.replace(old_edit_redirect, edit_redirect, 1)
elif edit_redirect not in text:
    text = text.replace(
        '    error_page 404 /404.html;',
        f'{edit_redirect}\n\n    error_page 404 /404.html;',
        1,
    )

about_redirects = '''    location = /about { return 301 https://labofpdf.com/about/editorial-team; }
    location = /about/ { return 301 https://labofpdf.com/about/editorial-team; }'''
if about_redirects not in text:
    text = text.replace(
        edit_redirect,
        f'{edit_redirect}\n{about_redirects}',
        1,
    )

release_json_rules = '''    location = /release.json {
        try_files $uri =404;
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header X-Robots-Tag "noindex, nofollow" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" always;
        add_header X-Permitted-Cross-Domain-Policies "none" always;
    }'''
if release_json_rules not in text:
    text = text.replace(
        about_redirects,
        f'{about_redirects}\n\n{release_json_rules}',
        1,
    )

old_asset_cache = '''            expires 1h;
            add_header Cache-Control public;'''
new_asset_cache = '''            expires 1y;
            add_header Cache-Control "public, max-age=31536000, immutable" always;'''
text = text.replace(old_asset_cache, new_asset_cache)
if 'expires 1h;' in text:
    raise SystemExit('A short JavaScript or CSS cache rule remains in the Lab of PDF Nginx configuration')

word_proxy = '''    location = /api/word-to-pdf {
        client_max_body_size 25m;
        proxy_request_buffering off;
        proxy_read_timeout 75s;
        proxy_send_timeout 75s;
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

'''
if 'location = /api/word-to-pdf' not in text:
    api_anchor = '    location /api/ {'
    if api_anchor not in text:
        raise SystemExit('Expected API proxy anchor was not found')
    text = text.replace(api_anchor, word_proxy + api_anchor, 1)

security_anchor = '    add_header Referrer-Policy strict-origin-when-cross-origin always;'
security_headers = '''    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header X-Permitted-Cross-Domain-Policies none always;'''
if 'add_header Permissions-Policy' not in text:
    if security_anchor not in text:
        raise SystemExit('Expected security-header anchor was not found')
    text = text.replace(security_anchor, security_headers, 1)

path.write_text(text)
PY

if ! nginx -t; then
  cp -a "$NGINX_BACKUP" "$NGINX_CONF"
  nginx -t
  rollback_api
  exit 1
fi

rm -rf "$PREV_ROOT"
mv "$APP_ROOT" "$PREV_ROOT"
mv "$NEXT_ROOT" "$APP_ROOT"
chown -R root:root "$APP_ROOT"
find "$APP_ROOT" -type d -exec chmod 755 {} +
find "$APP_ROOT" -type f -exec chmod 644 {} +
systemctl reload nginx

rollback() {
  rm -rf "$APP_ROOT"
  mv "$PREV_ROOT" "$APP_ROOT"
  cp -a "$NGINX_BACKUP" "$NGINX_CONF"
  nginx -t
  systemctl reload nginx
  rollback_api
}

verify_page() {
  local url="$1"
  local expected="$2"
  local label="$3"
  local body="/tmp/labofpdf-verify-body"
  local headers="/tmp/labofpdf-verify-headers"

  local attempt
  for attempt in $(seq 1 10); do
    if curl -ksS -D "$headers" --resolve labofpdf.com:443:127.0.0.1 "$url" -o "$body" && grep -q "$expected" "$body"; then
      return 0
    fi
    sleep 1
  done

  echo "$label verification failed after $attempt attempts; response follows." >&2
  sed -n '1,20p' "$headers" >&2 || true
  sed -n '1,30p' "$body" >&2 || true
  return 1
}

if ! verify_page https://labofpdf.com/guides 'Practical PDF Guides' 'Guides page'; then
  echo "Online verification failed; restoring the previous release." >&2
  rollback
  exit 1
fi

if ! verify_page https://labofpdf.com/guides/compress-pdf-for-university-upload 'university submission portal' 'Guide article'; then
  echo "Guide verification failed; restoring the previous release." >&2
  rollback
  exit 1
fi

if ! curl -kfsS --resolve labofpdf.com:443:127.0.0.1 https://labofpdf.com/release.json | grep -q "\"commit\": \"$RELEASE_COMMIT\""; then
  echo "Release manifest verification failed; restoring the previous release." >&2
  rollback
  exit 1
fi

if ! curl -kfsSI --resolve labofpdf.com:443:127.0.0.1 https://labofpdf.com/release.json | grep -qi '^x-robots-tag:.*noindex'; then
  echo "Release manifest indexing protection verification failed; restoring the previous release." >&2
  rollback
  exit 1
fi

if ! curl -kfsS --resolve labofpdf.com:443:127.0.0.1 https://labofpdf.com/api/health | grep -q '"wordConversionEngine":"libreoffice"'; then
  echo "Feedback API proxy verification failed; restoring the previous release." >&2
  rollback
  exit 1
fi

rm -rf "$PREV_ROOT"
rm -rf "$API_PREV" "$API_STAGE"
rm -f "$NGINX_BACKUP"
rm -f "$API_UNIT_BACKUP" /tmp/visitor-counter.service.next
echo "Release is live and temporary files have been removed."
du -sh "$APP_ROOT"
REMOTE

echo "Deployment completed successfully."
echo "Release tag: $RELEASE_TAG"
echo "Release commit: $RELEASE_COMMIT"
