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
RELEASE_COMMIT="$RELEASE_COMMIT" npm run build
test -f dist/index.html
test -f dist/guides.html
test -f dist/guides/compress-pdf-for-university-upload.html
grep -q "\"commit\": \"$RELEASE_COMMIT\"" dist/release.json

echo "Preparing a temporary release directory..."
ssh "$SERVER" "set -eu; rm -rf '$NEXT_ROOT'; mkdir -p '$NEXT_ROOT'"

echo "Uploading the verified build..."
rsync -az --delete dist/ "$SERVER:$NEXT_ROOT/"

echo "Validating and switching the release..."
ssh "$SERVER" 'bash -s' -- "$RELEASE_COMMIT" <<'REMOTE'
set -Eeuo pipefail

RELEASE_COMMIT="$1"
APP_ROOT="/var/www/labofpdf"
NEXT_ROOT="/var/www/labofpdf-next"
PREV_ROOT="/var/www/labofpdf-prev"
NGINX_CONF="/etc/nginx/sites-enabled/labofpdf.conf"
NGINX_BACKUP="/etc/nginx/labofpdf.conf.pre-deploy"

test -f "$NEXT_ROOT/index.html"
test -f "$NEXT_ROOT/guides.html"
test -f "$NEXT_ROOT/guides/compress-pdf-for-university-upload.html"
grep -q "\"commit\": \"$RELEASE_COMMIT\"" "$NEXT_ROOT/release.json"

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

rm -rf "$PREV_ROOT"
rm -f "$NGINX_BACKUP"
echo "Release is live and temporary files have been removed."
du -sh "$APP_ROOT"
REMOTE

echo "Deployment completed successfully."
echo "Release tag: $RELEASE_TAG"
echo "Release commit: $RELEASE_COMMIT"
