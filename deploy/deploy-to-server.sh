#!/usr/bin/env bash
set -Eeuo pipefail

SERVER="root@167.99.1.62"
APP_ROOT="/var/www/labofpdf"
NEXT_ROOT="/var/www/labofpdf-next"
PREV_ROOT="/var/www/labofpdf-prev"
NGINX_CONF="/etc/nginx/sites-enabled/labofpdf.conf"

cd "$(dirname "$0")/.."

echo "Building the production site..."
npm run build
test -f dist/index.html
test -f dist/guides.html
test -f dist/guides/compress-pdf-for-university-upload.html

echo "Preparing a temporary release directory..."
ssh "$SERVER" "set -eu; rm -rf '$NEXT_ROOT'; mkdir -p '$NEXT_ROOT'"

echo "Uploading the verified build..."
rsync -az --delete dist/ "$SERVER:$NEXT_ROOT/"

echo "Validating and switching the release..."
ssh "$SERVER" 'bash -s' <<'REMOTE'
set -Eeuo pipefail

APP_ROOT="/var/www/labofpdf"
NEXT_ROOT="/var/www/labofpdf-next"
PREV_ROOT="/var/www/labofpdf-prev"
NGINX_CONF="/etc/nginx/sites-enabled/labofpdf.conf"
NGINX_BACKUP="/etc/nginx/labofpdf.conf.pre-deploy"

test -f "$NEXT_ROOT/index.html"
test -f "$NEXT_ROOT/guides.html"
test -f "$NEXT_ROOT/guides/compress-pdf-for-university-upload.html"

cp -a "$NGINX_CONF" "$NGINX_BACKUP"
python3 - <<'PY'
from pathlib import Path

path = Path('/etc/nginx/sites-enabled/labofpdf.conf')
text = path.read_text()

old_try = 'try_files $uri $uri/ /index.html;'
new_try = 'try_files $uri $uri.html $uri/ =404;'
if old_try in text:
    text = text.replace(old_try, new_try, 1)
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
        '    location / {\n        try_files $uri $uri.html $uri/ =404;',
        '    error_page 404 /404.html;\n\n    location = /404.html { internal; }\n\n    location / {\n        try_files $uri $uri.html $uri/ =404;',
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

if ! curl -kfsS --resolve labofpdf.com:443:127.0.0.1 https://labofpdf.com/guides | grep -q 'Practical PDF Guides'; then
  echo "Online verification failed; restoring the previous release." >&2
  rollback
  exit 1
fi

if ! curl -kfsS --resolve labofpdf.com:443:127.0.0.1 https://labofpdf.com/guides/compress-pdf-for-university-upload | grep -q 'university submission portal'; then
  echo "Guide verification failed; restoring the previous release." >&2
  rollback
  exit 1
fi

rm -rf "$PREV_ROOT"
rm -f "$NGINX_BACKUP"
echo "Release is live and temporary files have been removed."
du -sh "$APP_ROOT"
REMOTE

echo "Deployment completed successfully."
