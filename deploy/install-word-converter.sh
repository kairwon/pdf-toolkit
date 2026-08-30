#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "$(id -u)" != "0" ]]; then
  echo "Run this provisioning script as root." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  libreoffice-writer \
  fonts-liberation2 \
  fonts-crosextra-carlito \
  fonts-crosextra-caladea \
  fonts-noto-core \
  fonts-noto-cjk \
  fonts-noto-color-emoji
apt-get clean

command -v libreoffice
libreoffice --headless --version
